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
    exportStatus,
    exportPercentage,
  } from "$lib/stores";
  import TimelineRibbon from "$lib/components/TimelineRibbon/TimelineRibbon.svelte";
  import Timeline from "$lib/components/Timeline/Timeline.svelte";
  import Region from "$lib/components/Region.svelte";
  import Inspector from "$lib/components/Inspector/Inspector.svelte";
  import { frame, getCurrentClips } from "$lib/utils";
  import Media from "$lib/components/Media.svelte";

  /**
   * Media that has been uploaded and fully resolved
   */
  let uploaded: Array<{
    uuid: string;
    title: string;
    media: Promise<App.Media>;
  }> = [];

  let videoRefs: Record<string, HTMLVideoElement> = {};
  let audioRefs: Record<string, HTMLAudioElement> = {};

  // get the UUIDs of the current audio clips (we return this as a comma-sep
  // string to prevent reactivity issues) FIXME: THIS KIND OF SUCKS ASS
  $: _videoUUIDs = getCurrentClips($videoClips, $time);
  $: videoUUIDs = _videoUUIDs ? _videoUUIDs.split(",") : null;

  $: _audioUUIDs = getCurrentClips($audioClips, $time);
  $: audioUUIDs = _audioUUIDs ? _audioUUIDs.split(",") : null;

  $: currVideo = $videoClips.filter(
    (v) => videoUUIDs?.includes(v.uuid) ?? false
  );

  $: currAudio = $audioClips.filter(
    (c) => audioUUIDs?.includes(c.uuid) ?? false
  );

  // Pause video/audio if able to
  $: if ($paused === true) {
    if (videoUUIDs) for (const uuid of videoUUIDs) videoRefs[uuid]?.pause();
    if (audioUUIDs) for (const uuid of audioUUIDs) audioRefs[uuid]?.pause();
  }

  // Play video/audio if able to when player unpauses
  $: if ($paused === false) {
    if (videoUUIDs) for (const uuid of videoUUIDs) videoRefs[uuid]?.play();
    if (audioUUIDs) for (const uuid of audioUUIDs) audioRefs[uuid]?.play();
  }

  // update video/audio playback when video/audio/time changes
  $: $time, updatePlayback("video", currVideo);
  $: $time, updatePlayback("audio", currAudio);

  // reset video/audio time when currently playing UUIDs change
  $: resetPlayback("video", videoUUIDs);
  $: resetPlayback("audio", audioUUIDs);

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

  /**
   * Iterates through the UUIDs of the specified type, and updates the playback
   * status accordingly as new clips enter the current time.
   *
   * @param type
   * @param clips This is included as a parameter to leverage reactive labeling
   */
  const updatePlayback = async (type: "video" | "audio", clips: App.Clip[]) => {
    await tick();

    const uuids = type === "video" ? videoUUIDs : audioUUIDs;
    const refs = type === "video" ? videoRefs : audioRefs;

    // if there's no audio to play or no current clip, we can return early.
    if (!uuids) return;

    for (const uuid of uuids) {
      // get the corresponding audio element and clip
      const el = refs[uuid];
      const clip = clips.find((c) => c.uuid === uuid);

      // if there's no audio element or corresponding clip, we can break
      if (!el || !clip) continue;

      if ($paused) {
        el.currentTime = $time - clip.offset + clip.start;
      }

      if (!$paused && el.paused) {
        el.play();
      }
    }
  };

  /**
   * Resets the playback of all current clips. This is run when the scrubber is
   * moved, or when the current video/audio UUIDs change.
   *
   * @param type
   * @param uuids This is included as a parameter to leverage reactive labeling
   */
  const resetPlayback = async (
    type: "video" | "audio",
    uuids: string[] | null
  ) => {
    await tick();

    const refs = type === "video" ? videoRefs : audioRefs;
    const currClips = type === "video" ? currVideo : currAudio;

    if (!uuids) return;

    for (const uuid of uuids) {
      const el = refs[uuid];
      const clip = currClips.find((c) => c.uuid === uuid);

      if (!el || !clip) continue;

      el.currentTime = $time - clip.offset + clip.start;
    }
  };

  onMount(() => requestAnimationFrame(frame));

  const upload = async (e: Event & { currentTarget: HTMLInputElement }) => {
    if (!e.currentTarget.files) return;
    for (const file of e.currentTarget.files) {
      uploaded = [...uploaded, resolveMedia(file)];
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
  <div class="flex items-center gap-2">
    {#if $exportStatus !== "export" && $exportStatus !== "setup"}
      <div class="h-1 w-24 rounded-full"></div>
    {:else if $exportStatus === "setup"}
      <div class="h-1 w-24 rounded-full bg-zinc-800 animate-pulse"></div>
    {:else}
      <div class="h-1 w-24 rounded-full bg-zinc-800">
        <div
          class="h-full bg-blue-400 rounded-full transition-all"
          style:width="{$exportPercentage * 100}%"
        ></div>
      </div>
    {/if}
    <button
      class="bg-zinc-800 p-1 h-5 rounded-md shadow-md flex flex-col items-center justify-center border border-zinc-700 disabled:brightness-50 disabled:cursor-not-allowed disabled:shadow-none"
      on:click={exportVideo}
      disabled={$exportStatus !== "idle" && $exportStatus !== "done"}
    >
      <p>Export</p>
    </button>
  </div>
</Region>

<div
  class="relative lg:row-start-2 lg:col-start-1 grid grid-cols-1 grid-rows-2 gap-2 overflow-scroll"
>
  <Region
    class="flex-grow flex flex-col gap-1 row-start-1 {$selected
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

    {#if uploaded.length === 0}
      <p style:color="rgba(0 0 0 / 0.75)">No media uploaded</p>
    {/if}
    <div class="flex-grow flex flex-col gap-1 overflow-scroll">
      {#each uploaded as { uuid, title, media } (uuid)}
        <Media
          {uuid}
          {title}
          {media}
          removeMedia={() => {
            uploaded = uploaded.filter((m) => m.uuid !== uuid);
          }}
        />
      {/each}
    </div>
  </Region>
  {#if $selected}
    {#key $selected}
      <Inspector uuid={$selected[0]} type={$selected[1]} />
    {/key}
  {/if}
</div>

<div
  class="overflow-hidden flex flex-col gap-2"
  bind:clientHeight={containerHeight}
  bind:clientWidth={containerWidth}
>
  <div
    class="relative overflow-hidden left-1/2 -translate-x-1/2 bg-black center"
    style:width="{playerRes[0]}px"
    style:height="{playerRes[1]}px"
  >
    {#if currVideo.length > 0}
      {#each currVideo as clip (clip.uuid)}
        <video
          class="absolute top-1/2 left-1/2"
          src={clip.media.src}
          title={clip.uuid}
          bind:this={videoRefs[clip.uuid]}
          style:transform="translate(-50%, -50%) matrix({clip.matrix
            .map((m, i) => (i === 0 || i == 3 ? m * $playerScale : m))
            .join(",")})"
          style:z-index={clip.z}
          bind:volume={clip.volume}
        >
          <track kind="captions" />
        </video>
      {/each}
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
    resetPlayback("video", videoUUIDs);
    resetPlayback("audio", audioUUIDs);
  }}
  on:clipMove={() => {
    resetPlayback("video", videoUUIDs);
    resetPlayback("audio", audioUUIDs);
  }}
/>

{#if currAudio.length > 0}
  {#each currAudio as clip (clip.uuid)}
    <audio
      class="hidden"
      src={clip.media.src}
      title={clip.uuid}
      bind:this={audioRefs[clip.uuid]}
      bind:volume={clip.volume}
    />
  {/each}
{/if}
