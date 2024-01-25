<script lang="ts">
  import { onMount, tick } from "svelte";
  import { resolveMedia } from "$lib/loader";
  import { exportVideo } from "$lib/export";
  import {
    time,
    videoClips,
    playerScale,
    res,
    safeRes,
    selected,
    paused,
    audioClips,
  } from "$lib/stores";
  import ResolvedMedia from "$lib/components/ResolvedMedia.svelte";
  import TimelineRibbon from "$lib/components/TimelineRibbon/TimelineRibbon.svelte";
  import Timeline from "$lib/components/Timeline/Timeline.svelte";
  import Region from "$lib/components/Region.svelte";
  import Inspector from "$lib/components/Inspector/Inspector.svelte";
  import { frame, getCurrentVideo, getCurrentAudio } from "$lib/utils";

  /**
   * Media that has been uploaded and fully resolved
   */
  let resolved: App.Media[] = [];

  /**
   * The current playing video
   */
  let videoEl: HTMLVideoElement | null = null;
  let audioRefs: Record<string, HTMLAudioElement> = {};

  // get the UUID of the current clip (instead of clip itself, to prevent
  // reactivity issues)
  $: currVideoUUID = getCurrentVideo($videoClips, $time);

  // get the UUIDs of the current audio clips (we return this as a comma-sep
  // string to prevent reactivity issues) FIXME: THIS KIND OF SUCKS ASS!!!!!!
  $: _currAudioUUIDs = getCurrentAudio($audioClips, $time);
  $: currAudioUUIDs = _currAudioUUIDs ? _currAudioUUIDs.split(",") : null;

  $: currVideo = $videoClips.find((c) => c.uuid === currVideoUUID) ?? null;
  $: currVideoSrc = currVideo?.media.src ?? null;

  $: currAudio = $audioClips.filter(
    (c) => currAudioUUIDs?.includes(c.uuid) ?? false
  );

  $: matrix = currVideo?.matrix ?? ([1, 0, 0, 1, 0, 0] as App.Matrix);

  $: if ($paused === true && videoEl) videoEl.pause();
  $: if ($paused === true && currAudioUUIDs) {
    for (const uuid of currAudioUUIDs) audioRefs[uuid]?.pause();
  }

  $: if ($paused === false && videoEl) videoEl.play();
  $: if ($paused === false && currAudioUUIDs) {
    for (const uuid of currAudioUUIDs) audioRefs[uuid]?.play();
  }

  // when currentVideo changes, update
  $: currVideo, $time, updateVideo();
  $: currAudio, $time, updateAudio();
  // reset video time when video changes
  $: currVideoUUID, resetVideoTime();
  $: currAudioUUIDs, resetAudioTime();

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

  const updateVideo = async () => {
    await tick();

    // if there's no video to play or no current clip, we can return early.
    if (!videoEl || !currVideo) return;

    if ($paused) {
      videoEl.currentTime = $time - currVideo.offset + currVideo.start;
    }

    if (!$paused && videoEl.paused) {
      videoEl.play();
    }
  };

  const updateAudio = async () => {
    await tick();

    // if there's no audio to play or no current clip, we can return early.
    if (!currAudioUUIDs) return;

    console.log("we iterating");

    for (const uuid of currAudioUUIDs) {
      // get the corresponding audio element and clip
      const el = audioRefs[uuid];
      const clip = currAudio.find((c) => c.uuid === uuid);

      // if there's no audio element or corresponding clip, we can break
      if (!el || !clip) continue;

      if ($paused) {
        el.currentTime = $time - clip.offset + clip.start;
      }

      if (!$paused && el.paused) {
        console.log("we playing");
        el.play();
      }
    }
  };

  /**
   * Runs when the current video UUID to play changes, or when the scrubber is
   * moved and we are playing a video. Used to reset the currentTime property to
   * correctly account for the current offset.
   */
  const resetVideoTime = async () => {
    // if there's no UUID, there's no video playing; we can return
    if (!currVideoUUID) return;

    await tick();

    if (!videoEl || !currVideo) return;

    videoEl.currentTime = $time - currVideo.offset + currVideo.start;
  };

  /**
   * Runs when any current audio UUIDs to play changes, or when the scrubber is
   * moved and we are playing audio. Used to reset the currentTime property of
   * all current audio clips to correctly account for the current offset.
   */
  const resetAudioTime = async () => {
    await tick();

    // if there are no audio UUIDs, we can break
    if (!currAudioUUIDs) return;

    console.log("we iterating reset");

    for (const uuid of currAudioUUIDs) {
      // get the corresponding audio element and clip
      const el = audioRefs[uuid];
      const clip = currAudio.find((c) => c.uuid === uuid);

      // if there's no audio element or corresponding clip, we can break
      // TODO: ensure this never happens and remove in future.
      if (!el || !clip) continue;

      el.currentTime = $time - clip.offset + clip.start;
    }
  };

  onMount(() => requestAnimationFrame(frame));

  const upload = async (e: Event & { currentTarget: HTMLInputElement }) => {
    if (!e.currentTarget.files) return;
    for (const file of e.currentTarget.files) {
      const media = await resolveMedia(file);
      resolved = [...resolved, media];
    }
  };
</script>

<Region
  class="flex justify-between items-center lg:row-start-1 lg:col-start-1 lg:col-span-full"
>
  <label class="flex gap-2">
    <p>res X</p>
    <input
      class="w-16 px-2 rounded-md border border-zinc-300 font-mono text-sm dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
      type="number"
      bind:value={$res[0]}
      step="2"
    />
  </label>
  <label class="flex gap-2">
    <p>res Y</p>
    <input
      class="w-16 px-2 rounded-md border border-zinc-300 font-mono text-sm dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
      type="number"
      bind:value={$res[1]}
      step="2"
    />
  </label>
  <button
    class="bg-zinc-800 p-1 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
    on:click={exportVideo}
  >
    <p>Export</p>
  </button>
</Region>

<div class="lg:row-start-2 lg:col-start-1 grid grid-cols-1 grid-rows-2 gap-2">
  <Region
    class="flex-grow flex flex-col gap-1 overflow-scroll row-start-1 {$selected
      ? ''
      : 'row-span-full'}"
  >
    <label>
      <p
        class="w-fit bg-zinc-800 p-1 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
      >
        Upload
      </p>
      <input
        class="hidden"
        type="file"
        accept="video/mp4,audio/mp3"
        multiple
        on:change={upload}
      />
    </label>

    {#if resolved.length === 0}
      <p style:color="rgba(0 0 0 / 0.75)">No media uploaded</p>
    {/if}
    {#each resolved as file}
      <ResolvedMedia media={file} />
    {/each}
  </Region>
  {#if $selected}
    <Inspector
      on:matrixChange={(e) => {
        // when a clip's matrix changes, compare the UUID of the clip to the
        // current UUID. if they match, update the matrix.

        // TODO: remove this event handler in the future, this blocks multiple
        // clips from being played at once.
        if ($selected === currVideoUUID) {
          matrix = e.detail;
        }
      }}
    />
  {/if}
</div>

<div
  class="overflow-hidden flex flex-col gap-2"
  bind:clientHeight={containerHeight}
  bind:clientWidth={containerWidth}
>
  <div
    class="relative overflow-hidden left-1/2 -translate-x-1/2 bg-black center flex justify-center items-center"
    style:width="{playerRes[0]}px"
    style:height="{playerRes[1]}px"
  >
    {#if currVideo && currVideoSrc}
      <video
        src={currVideoSrc}
        bind:this={videoEl}
        title={currVideo.uuid}
        style:transform="matrix({matrix
          .map((m, i) => (i === 0 || i == 3 ? m * $playerScale : m))
          .join(",")})"
      >
        <track kind="captions" />
      </video>
    {/if}
  </div>
  <Region class="w-fit flex gap-2 mx-auto">
    <button
      class="bg-zinc-800 p-1 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
      aria-label="Skip to start"
      on:click={() => {
        $time = 0;
        $paused = true;
      }}>⏮️</button
    >
    <button
      class="bg-zinc-800 p-1 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
      aria-label="Play/pause"
      on:click={() => ($paused = !$paused)}
    >
      {$paused ? "▶️" : "⏸️"}
    </button>
    <button
      class="bg-zinc-800 p-1 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
      aria-label="Skip to end"
      on:click={() => {
        $paused = true;
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
  </Region>
</div>

<TimelineRibbon />

<!-- Update the currentTime property of the current video playing when either
  the scrubber moves, or the current video's offset is changed (via drag) -->
<Timeline
  on:scrubberMove={() => {
    resetVideoTime();
    resetAudioTime();
  }}
  on:clipMove={() => {
    resetVideoTime();
    resetAudioTime();
  }}
/>

{#if currAudio.length > 0}
  {#each currAudio as clip (clip.uuid)}
    <audio
      class="hidden"
      src={clip.media.src}
      title={clip.uuid}
      bind:this={audioRefs[clip.uuid]}
    />
  {/each}
{/if}
