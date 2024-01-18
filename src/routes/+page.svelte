<script lang="ts">
  import { onMount, tick } from "svelte";
  import { resolveMedia } from "$lib/loader";
  import { exportVideo } from "$lib/export";
  import {
    scaleFactor,
    time,
    videoClips,
    scale,
    tickWidth,
    secondsPerTick,
    playerScale,
    res,
    safeRes,
  } from "$lib/stores";
  import ResolvedMedia from "$lib/components/ResolvedMedia.svelte";
  import TimelineClip from "$lib/components//TimelineClip.svelte";
  import Runtime from "$lib/components/Runtime.svelte";
  import { getClipEndPos, getLastTimelineClip } from "$lib/utils";
  import TimelineRibbon from "$lib/components/TimelineRibbon/TimelineRibbon.svelte";

  let paused = true;

  let canMoveScrubber = false;

  /**
   * Most recent files uploaded by the user
   */
  let files: FileList | null = null;
  /**
   * Media that has been uploaded and fully resolved
   */
  let resolved: App.Media[] = [];

  let tickContainer: HTMLDivElement;
  /**
   * The current playing video
   */
  let videoEl: HTMLVideoElement | null = null;
  /**
   * The container for the video element
   */
  let playerWidth: number;
  let timelineEl: HTMLDivElement;

  /**
   * The offset of the timeline from the left side of the screen. computed with
   * getBoundingClientRect and clientLeft, which accounts for the margin and
   * border of the element, respectively.
   *
   * @default 9 (a dirty default)
   */
  $: timelineOffset =
    timelineEl?.getBoundingClientRect().left + timelineEl?.clientLeft ?? 9;

  // get the UUID of the current clip (instead of clip itself, to prevent
  // reactivity issues)
  $: currentUUID = getCurrentClip($videoClips);

  // TODO: seems like only one media src would play at a time?
  // reproduce: upload two vids, add both to timeline, only one plays????
  $: current = $videoClips.find((c) => c.uuid === currentUUID) ?? null;

  // change the matrix when the current clip changes
  $: matrix = current?.matrix ?? ([1, 0, 0, 1, 0, 0] as App.Matrix);

  $: if (paused === true && videoEl) videoEl.pause();
  $: if (paused === false && videoEl) videoEl.play();

  // when currentVideo changes, update
  $: current, $time, updatePlayer();
  // reset video time when video changes
  $: currentUUID, resetVideoTime();

  /**
   * The number of timings to display on the timeline. If there are no clips,
   * it's the scrubber time + 30 seconds. Otherwise, it's either the scrubber
   * time + 30 seconds or the end of the last clip + 30 seconds, whichever is
   * greater.
   */
  $: numTiming =
    (() => {
      if ($videoClips.length === 0) return Math.ceil($time);
      return Math.ceil(Math.max($time, getClipEndPos(getLastTimelineClip()!)));
    })() + 30;

  $: tickTimings = Array.from({ length: numTiming }, (_, i) =>
    // NOTE: here we use toPrecision to prevent floating point errors from
    // giving us wonky timestamps.
    (i * $secondsPerTick).toPrecision(4)
  );

  let containerHeight: number = 1;
  let containerWidth: number = 1;
  // contain container width/height to 1280x720
  $: safeContainerWidth = Math.min(containerWidth, 1280);
  // FIXME: this lazily drops 48 px to account for the ribbon--fix in future
  $: safeContainerHeight = Math.min(containerHeight, 720) - 48;

  /**
   * The resolution of the player. This value is scaled based on the sizing of
   * the player's container.
   */
  let playerRes = [$safeRes[0], $safeRes[1]] as [number, number];

  /**
   * Rescale the player resolution when any variable that may affect it changes.
   */
  $: playerRes = (() => {
    // compare aspect ratio of video's resolution to that of the safe container
    if ($safeRes[0] / $safeRes[1] < safeContainerWidth / safeContainerHeight) {
      // if video aspect < safe container aspect, we need to shrink the height
      // of the player to fit, and scale the width accordingly. we can lazily
      // assume the player height is the same as the safe container height
      const playerScalingFactor = safeContainerHeight / $safeRes[1];
      const w = $safeRes[0] * playerScalingFactor;
      return [w, safeContainerHeight];
    } else {
      // if video aspect > safe container aspect, we need to shrink the width
      // of the player to fit, and scale the height accordingly. we can lazily
      // assume the player width is the same as the safe container width
      const playerScalingFactor = safeContainerWidth / $safeRes[0];
      const h = $safeRes[1] * playerScalingFactor;
      return [safeContainerWidth, h];
    }
  })();

  // update scaling factor of player, which is used to scale the video element
  $: $playerScale = playerRes[0] / $safeRes[0];

  const updatePlayer = async () => {
    await tick();

    // if there's no video to play or no current clip, we can return early.
    if (!videoEl || !current) return;

    if (paused) {
      videoEl.currentTime = $time - current.offset + current.start;
    }

    if (!paused && videoEl.paused) {
      videoEl.play();
    }
  };

  /**
   * Runs when the current UUID to play changes. Used to reset the video's
   * currentTime property to correctly account for the current offset.
   */
  const resetVideoTime = async () => {
    // if there's no UUID, there's no video playing; we can return
    if (!currentUUID) return;

    await tick();

    if (!videoEl || !current) return;

    videoEl.currentTime = $time - current.offset + current.start;
  };

  let lastTimestamp = 0;
  const frame = (timestamp: DOMHighResTimeStamp) => {
    if (paused) {
      lastTimestamp = timestamp;
      requestAnimationFrame(frame);
      return;
    }

    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    $time += delta / 1000;

    requestAnimationFrame(frame);
  };

  onMount(() => requestAnimationFrame(frame));

  const upload = async () => {
    if (!files) return;
    for (const file of files) {
      const media = await resolveMedia(file);
      resolved = [...resolved, media];
    }

    files = null;
  };

  const moveScrubber = (clientX: number) => {
    const rect = tickContainer.getBoundingClientRect();
    const x = Math.max(0, clientX - rect.left);
    $time = x / $scaleFactor;
  };

  $: getCurrentClip = (clips: App.Clip[]): string | null => {
    let valid: App.Clip[] = [];
    for (const clip of clips) {
      const clipDuration = clip.media.duration - clip.start - clip.end;
      if (clip.offset < $time && clip.offset + clipDuration > $time)
        valid.push(clip);
      if (clip.offset > $time) break;
    }
    return valid.sort((a, b) => b.z - a.z)[0]?.uuid ?? null;
  };
</script>

<svelte:window
  on:mousemove={(e) => {
    if (canMoveScrubber) moveScrubber(e.clientX);
  }}
  on:mouseup={() => (canMoveScrubber = false)}
  on:keydown={(e) => {
    if (e.ctrlKey) {
      if (e.key === "=") {
        e.preventDefault();
        $scale = Math.min(4, $scale + 0.1);
      }
      if (e.key === "-") {
        e.preventDefault();
        $scale = Math.max(0.1, $scale - 0.1);
      }
      if (e.key === "0") {
        e.preventDefault();
        $scale = 1;
      }
    }
  }}
/>

<div class="region ribbon">
  <label class="resolution-label">
    <p>res X</p>
    <input type="number" bind:value={$res[0]} step="2" />
    <output>{$safeRes[0]}</output>
  </label>
  <label class="resolution-label">
    <p>res Y</p>
    <input type="number" bind:value={$res[1]} step="2" />
    <output>{$safeRes[1]}</output>
  </label>
  <button on:click={exportVideo}>Export</button>
</div>

<div class="region media-browser">
  <input type="file" accept="video/*" multiple bind:files on:change={upload} />
  {#if resolved.length === 0}
    <p style:color="rgba(0 0 0 / 0.75)">No media uploaded</p>
  {/if}
  {#each resolved as file}
    <ResolvedMedia {file} />
  {/each}
</div>

<div
  class="player-container"
  bind:clientHeight={containerHeight}
  bind:clientWidth={containerWidth}
>
  <div
    class="player"
    bind:clientWidth={playerWidth}
    style:width="{playerRes[0]}px"
    style:height="{playerRes[1]}px"
  >
    {#if current}
      <video
        src={current.media.src}
        class="media"
        bind:this={videoEl}
        title={current.uuid}
        style:transform="matrix({matrix
          .map((m, i) => (i === 0 || i == 3 ? m * $playerScale : m))
          .join(",")})"
      >
        <track kind="captions" />
      </video>
    {/if}
  </div>
  <div class="region ribbon media-controls">
    <button
      on:click={() => {
        $time = 0;
        paused = true;
      }}>⏮️</button
    >
    <button on:click={() => (paused = !paused)}>
      {paused ? "▶️" : "⏸️"}
    </button>
    <button
      on:click={() => {
        paused = true;
        $time = $videoClips.reduce(
          (acc, clip) =>
            Math.max(
              acc,
              clip.offset + (clip.media.duration - clip.start - clip.end)
            ),
          0
        );
      }}>⏭️</button
    >
  </div>
</div>

<TimelineRibbon />

<div class="region timeline" bind:this={timelineEl}>
  <div class="tick-container" bind:this={tickContainer}>
    {#each tickTimings as time}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="tick"
        style:width="{$tickWidth}px"
        on:mousedown={(e) => {
          canMoveScrubber = true;
          moveScrubber(e.clientX);
        }}
      >
        <Runtime time={parseInt(time)} />
      </div>
    {/each}
  </div>
  <div class="row">
    {#each $videoClips as clip}
      <TimelineClip
        {clip}
        {timelineOffset}
        on:matrixChange={(e) => {
          // when a clip's matrix changes, compare the UUID of the clip to the
          // current UUID. if they match, update the matrix.

          // TODO: remove this event handler in the future, this blocks multiple
          // clips from being played at once.
          if (clip.uuid === currentUUID) {
            matrix = e.detail;
          }
        }}
      />
    {/each}
  </div>
  <div
    class="scrubber"
    style="transform: translateX({$time * $scaleFactor}px; z-index: 9999999;"
  />
</div>

<style>
  * {
    box-sizing: border-box;
  }

  .region {
    border: 1px solid rgba(200 200 200 / 1);
    border-radius: 0.5rem;
    padding: 0.5rem;
  }

  .ribbon {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
  }

  .resolution-label {
    display: flex;
    gap: 0.5rem;
  }

  .resolution-label > input {
    width: 4rem;
  }

  .media-browser {
    display: flex;
    flex-direction: column;
    overflow-y: scroll;

    gap: 0.5rem;
  }

  .player-container {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .player-container .player {
    position: relative;
    overflow: hidden;
    left: 50%;
    transform: translateX(-50%);
    background-color: black;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .player-container .ribbon {
    width: fit-content;
    margin: 0 auto;
  }

  .timeline {
    position: relative;
    padding: 0;
    overflow-x: scroll;
  }

  .timeline > .tick-container {
    height: 1rem;
    display: flex;
  }

  .tick {
    height: 100%;
    flex-shrink: 0;
    background-color: rgba(220 220 220 / 0.75);
    border-right: 1px solid rgba(100 100 100 / 0.75);
    padding-left: 2px;
    position: relative;
    overflow: hidden;
    user-select: none;
  }

  .timeline > .row {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    /* TODO: can prob remove dirty calc with flex/grid in .timeline class? */
    height: calc(100% - 1rem);
  }

  .scrubber {
    top: 0;
    position: absolute;
    width: 2px;
    height: 100%;
    background-color: rgba(0 0 0 / 0.75);
  }

  @media (min-width: 1024px) {
    .ribbon {
      grid-area: 1/1/2/3;
    }

    .media-browser {
      grid-area: 2/1;
    }

    .player-container {
      grid-area: 2/2;
    }

    .timeline {
      grid-area: 4/1/5/3;
    }
  }
</style>
