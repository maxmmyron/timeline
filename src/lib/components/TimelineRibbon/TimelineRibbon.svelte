<script lang="ts">
  import {
    scale,
    videoClips,
    time,
    selected,
    audioClips,
    paused,
    pointerMode,
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
  import PointerIcon from "$lib/icon/PointerIcon.svelte";
  import SplitClipIcon from "$lib/icon/SplitClipIcon.svelte";

  const decrease = () => {
    $scale = Math.max(0.02, $scale - 0.25);
  };

  const increase = () => {
    $scale = Math.min(5, $scale + 0.25);
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
    <IconButton
      alt="Click"
      toggled={$pointerMode === "select"}
      on:click={() => ($pointerMode = "select")}
    >
      <PointerIcon />
    </IconButton>
    <IconButton
      alt="Select"
      toggled={$pointerMode === "slice"}
      on:click={() => ($pointerMode = "slice")}
    >
      <SplitClipIcon />
    </IconButton>
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
