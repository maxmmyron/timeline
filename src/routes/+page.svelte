<script lang="ts">
  import { onMount, tick } from "svelte";
  import { resolveMedia } from "$lib/loader";
  import { exportVideo } from "$lib/export";
  import {
    scaleFactor,
    time,
    videoClips,
    tickWidth,
    secondsPerTick,
    playerScale,
    res,
    safeRes,
    selected,
    paused,
  } from "$lib/stores";
  import ResolvedMedia from "$lib/components/ResolvedMedia.svelte";
  import TimelineRibbon from "$lib/components/TimelineRibbon/TimelineRibbon.svelte";
  import Timeline from "$lib/components/Timeline/Timeline.svelte";
  import Region from "$lib/components/Region.svelte";
  import Inspector from "$lib/components/Inspector/Inspector.svelte";
  import { frame, getCurrentClip } from "$lib/utils";

  /**
   * Most recent files uploaded by the user
   */
  let files: FileList | null = null;
  /**
   * Media that has been uploaded and fully resolved
   */
  let resolved: App.Media[] = [];

  /**
   * The current playing video
   */
  let videoEl: HTMLVideoElement | null = null;

  // get the UUID of the current clip (instead of clip itself, to prevent
  // reactivity issues)
  $: currentUUID = getCurrentClip($videoClips, $time);

  // TODO: seems like only one media src would play at a time?
  // reproduce: upload two vids, add both to timeline, only one plays????
  $: current = $videoClips.find((c) => c.uuid === currentUUID) ?? null;
  $: currentSrc = current?.media.src ?? null;

  $: matrix = current?.matrix ?? ([1, 0, 0, 1, 0, 0] as App.Matrix);

  $: if ($paused === true && videoEl) videoEl.pause();
  $: if ($paused === false && videoEl) videoEl.play();

  // when currentVideo changes, update
  $: current, $time, updatePlayer();
  // reset video time when video changes
  $: currentUUID, resetVideoTime();

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

    if ($paused) {
      videoEl.currentTime = $time - current.offset + current.start;
    }

    if (!$paused && videoEl.paused) {
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

  onMount(() => requestAnimationFrame(frame));

  const upload = async () => {
    if (!files) return;
    for (const file of files) {
      const media = await resolveMedia(file);
      resolved = [...resolved, media];
    }

    files = null;
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
        accept="video/*"
        multiple
        bind:files
        on:change={upload}
      />
    </label>

    {#if resolved.length === 0}
      <p style:color="rgba(0 0 0 / 0.75)">No media uploaded</p>
    {/if}
    {#each resolved as file}
      <ResolvedMedia {file} />
    {/each}
  </Region>
  {#if $selected}
    <Inspector
      on:matrixChange={(e) => {
        // when a clip's matrix changes, compare the UUID of the clip to the
        // current UUID. if they match, update the matrix.

        // TODO: remove this event handler in the future, this blocks multiple
        // clips from being played at once.
        if ($selected === currentUUID) {
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
    {#if current && currentSrc}
      <video
        src={currentSrc}
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
<Timeline on:scrubberMove={resetVideoTime} on:clipMove={resetVideoTime} />
