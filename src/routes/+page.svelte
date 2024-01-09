<script lang="ts">
  import { onMount, tick } from "svelte";
  import { resolveMedia } from "$lib/loader";
  import { exportVideo } from "$lib/export";
  import { TIME_SCALING, time, videoClips } from "$lib/stores";
  import ResolvedMedia from "$lib/components/ResolvedMedia.svelte";
  import TimelineClip from "$lib/components//TimelineClip.svelte";
  import Runtime from "$lib/components/Runtime.svelte";

  let paused = true;

  let canMoveScrubber = false;

  let z = 0;

  /**
   * Most recent files uploaded by the user
   */
  let files: FileList | null = null;
  /**
   * Media that has been uploaded and fully resolved
   */
  let resolved: App.Media[] = [];

  let tickContainer: HTMLDivElement;
  let videoEl: HTMLVideoElement | null = null;

  // get the UUID of the current clip (instead of clip itself, to prevent
  // reactivity issues)
  $: currentUUID = getCurrentClip($videoClips);
  $: current = $videoClips.find((c) => c.uuid === currentUUID) ?? null;

  $: if (paused === true && videoEl) videoEl.pause();
  $: if (paused === false && videoEl) videoEl.play();

  // when currentVideo changes, update
  $: current, $time, updatePlayer();
  // reset video time when video changes
  $: currentUUID, resetVideoTime();

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

  const resolveFiles = async () => {
    if (!files) return;
    for (const file of files) {
      // TODO: more robust type assertion
      const media = await resolveMedia(file);
      resolved = [...resolved, media];
    }

    files = null;
  };

  const moveScrubber = (clientX: number) => {
    const rect = tickContainer.getBoundingClientRect();
    const x = clientX - rect.left;
    $time = x / TIME_SCALING;
  };

  const createClip = (resolved: App.Media): App.Clip => ({
    media: resolved,
    offset: $time,
    start: 0,
    end: 0,
    // TODO: improve UUID gen.
    uuid: Math.random().toString(36).substring(7),
    z: z++,
  });

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
/>

<div class="ribbon">
  <input
    type="file"
    accept="video/*"
    multiple
    bind:files
    on:change={resolveFiles}
  />
  <button on:click={exportVideo}>Export</button>
</div>

<div class="media-browser">
  {#each resolved as file}
    <ResolvedMedia
      {file}
      on:click={() => ($videoClips = [...$videoClips, createClip(file)])}
    />
  {/each}
</div>

<div class="player">
  {#if current}
    <video
      src={current.media.src}
      class="media"
      bind:this={videoEl}
      title={current.uuid}
    >
      <track kind="captions" />
    </video>
  {/if}
</div>

<div class="ribbon media-ribbon">
  <div class="media-controls">
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
  <Runtime time={$time} />
</div>

<div class="timeline">
  <div class="tick-container" bind:this={tickContainer}>
    {#each { length: Math.ceil($time) + 30 } as _, i}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="tick"
        style:width="{TIME_SCALING}px"
        on:mousedown={(e) => {
          canMoveScrubber = true;
          moveScrubber(e.clientX);
        }}
      >
        <Runtime time={i} />
      </div>
    {/each}
  </div>
  <div class="row">
    {#each $videoClips as clip}
      <TimelineClip
        {clip}
        on:click={() => (clip.z = Math.max(...$videoClips.map((c) => c.z)) + 1)}
      />
    {/each}
  </div>
  <div
    class="scrubber"
    style="transform: translateX({$time * TIME_SCALING}px; z-index: 9999999;"
  />
</div>

<style>
  * {
    box-sizing: border-box;
  }

  .ribbon {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
  }

  .ribbon.media-ribbon {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: 1fr;
    grid-gap: 0.5rem;
  }

  .media-browser {
    display: flex;
    border: 1px solid rgba(200 200 200 / 1);
    border-radius: 12px;
    overflow-x: scroll;
    padding: 0.5rem;
    margin: 0 0.5rem;
    gap: 0.5rem;
  }

  .media-ribbon > .media-controls {
    grid-area: 1/2;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.25rem;
  }

  div.player {
    margin: 0 0.5rem;
    place-content: center center;
    aspect-ratio: 16 / 9;
    max-width: 1280px;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: black;
  }

  .timeline {
    margin: 0 0.5rem 0.5rem;
    position: relative;
    overflow-x: scroll;
    border-radius: 4px;
    border: 1px solid rgba(200 200 200 / 1);
  }

  .timeline > .tick-container {
    height: 1rem;
    display: flex;
  }

  .tick {
    height: 100%;
    flex-shrink: 0;
    background-color: rgba(200 200 200 / 0.75);
    border-right: 1px solid rgba(100 100 100 / 0.75);
    position: relative;
    user-select: none;
  }

  .timeline > .row {
    position: relative;
    width: 100%;
    height: 64px;
  }

  .scrubber {
    top: 0;
    position: absolute;
    width: 2px;
    height: 100%;
    background-color: rgba(0 0 0 / 0.75);
  }
</style>
