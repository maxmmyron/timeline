<script lang="ts">
  import { scale, videoClips, time, paused, pointerMode } from "$lib/stores";
  import { updateScrubberAndScroll } from "$lib/utils";
  import IconButton from "../IconButton.svelte";
  import Region from "../Region.svelte";
  import Runtime from "../Runtime.svelte";

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
      name="Pointer"
      alt="Click"
      toggled={$pointerMode === "select"}
      on:click={() => ($pointerMode = "select")}
    />
    <IconButton
      name="SplitClip"
      alt="Select"
      toggled={$pointerMode === "slice"}
      on:click={() => ($pointerMode = "slice")}
    />
  </div>
  <div class="flex gap-1">
    <IconButton name="ZoomOut" alt="Zoom Out" on:click={decrease} />
    <input type="range" min="0.02" max="5" step="0.001" bind:value={$scale} />
    <IconButton name="ZoomIn" alt="Zoom In" on:click={increase} />
  </div>
  <div class="flex items-center gap-3">
    <IconButton
      name="BeginningSkip"
      alt="Skip to start"
      on:click={() => {
        $paused = true;
        updateScrubberAndScroll(0);
      }}
    />
    <IconButton
      name={$paused ? "Play" : "Pause"}
      alt="Play/Pause"
      on:click={() => ($paused = !$paused)}
    />
    <IconButton
      name="EndSkip"
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
      }}
    />
    >
  </div>
  <Runtime time={$time} />
</Region>
