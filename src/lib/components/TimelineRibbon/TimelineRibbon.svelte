<script lang="ts">
  import {
    scale,
    videoClips,
    time,
    selected,
    audioClips,
    paused,
  } from "$lib/stores";
  import {
    createClip,
    getCurrentClips,
    updateScrubberAndScroll,
  } from "$lib/utils";
  import IconButton from "../IconButton.svelte";
  import Region from "../Region.svelte";
  import Runtime from "../Runtime.svelte";
  import ZoomOutIcon from "$lib/icon/ZoomOutIcon.svelte";
  import ZoomInIcon from "$lib/icon/ZoomInIcon.svelte";
  import BeginningSkipIcon from "$lib/icon/BeginningSkip.svelte";
  import PlayIcon from "$lib/icon/Play.svelte";
  import PauseIcon from "$lib/icon/Pause.svelte";
  import EndSkipIcon from "$lib/icon/EndSkip.svelte";

  const decrease = () => {
    $scale = Math.max(0.02, $scale - 0.25);
  };

  const increase = () => {
    $scale = Math.min(5, $scale + 0.25);
  };

  const slice = (type: App.MediaType, clips: App.Clip[]) => {
    if (!$selected) return;
    if ($selected[1] !== type) return;

    const clip = clips.find((c) => c.uuid === $selected![0]) as App.Clip;

    // if the time is outside the clip, do nothing
    if ($time < clip.offset || $time > clip.offset + clip.media.duration)
      return;

    let timeOffset = $time - clip.offset;
    let clipDuration = clip.media.duration - clip.start - clip.end;

    const leftClip = createClip(
      { ...clip.media },
      {
        offset: clip.offset,
        start: clip.start,
        end: clip.end + (clipDuration - timeOffset),
        matrix: [...clip.matrix],
      }
    );

    const rightClip = createClip(
      { ...clip.media },
      {
        offset: clip.offset + timeOffset,
        start: clip.start + timeOffset,
        end: clip.end,
        matrix: [...clip.matrix],
      }
    );

    clips = [...clips, leftClip, rightClip];
    const oldUUID = $selected[0];
    $selected = null;
    clips = clips.filter((c) => c.uuid !== oldUUID);

    // update stores to reflect changes
    if (type !== "audio") $videoClips = clips;
    else $audioClips = clips;
  };
</script>

<svelte:window
  on:keydown={(e) => {
    // ctrl shift + or -: zoom in or out
    if (e.ctrlKey && e.altKey && e.key === "=") {
      e.preventDefault();
      increase();
    } else if (e.ctrlKey && e.altKey && e.key === "-") {
      e.preventDefault();
      decrease();
    } else if (e.ctrlKey && e.altKey && e.key === "0") {
      e.preventDefault();
      $scale = 1;
    }
  }}
/>

<Region class="flex items-center justify-between h-12 text-zinc-400">
  <div class="flex gap-2">
    <button
      class="bg-zinc-800 p-1 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700 disabled:brightness-50 disabled:cursor-not-allowed disabled:shadow-none"
      disabled={!$selected || $selected[1] === "audio"}
      on:click={() => slice("video", $videoClips)}>slice vid</button
    >
    <button
      class="bg-zinc-800 p-1 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700 disabled:brightness-50 disabled:cursor-not-allowed disabled:shadow-none"
      disabled={!$selected || $selected[1] !== "audio"}
      on:click={() => slice("audio", $audioClips)}>slice aud</button
    >
  </div>
  <div class="flex gap-1">
    <IconButton alt="Zoom Out" on:click={decrease}>
      <ZoomOutIcon />
    </IconButton>
    <input type="range" min="0.02" max="5" step="0.001" bind:value={$scale} />
    <IconButton alt="Zoom In" on:click={increase}>
      <ZoomInIcon />
    </IconButton>
  </div>
  <div class="flex items-center gap-3">
    <IconButton
      alt="Skip to start"
      on:click={() => {
        $paused = true;
        updateScrubberAndScroll(0);
      }}><BeginningSkipIcon /></IconButton
    >
    <IconButton alt="Play/Pause" on:click={() => ($paused = !$paused)}>
      {#if $paused}
        <PlayIcon />
      {:else}
        <PauseIcon />
      {/if}
    </IconButton>
    <IconButton
      alt="Skip to end"
      on:click={() => {
        $paused = true;
        updateScrubberAndScroll(
          $videoClips.reduce(
            (acc, clip) =>
              Math.max(
                acc,
                clip.offset + (clip.media.duration - clip.start - clip.end)
              ),
            0
          )
        );
      }}><EndSkipIcon /></IconButton
    >
  </div>
  <Runtime time={$time} />
</Region>
