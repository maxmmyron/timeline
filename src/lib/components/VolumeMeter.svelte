<script lang="ts" context="module">
  let leftChannelAnalyzer: AnalyserNode;
  let rightChannelAnalyzer: AnalyserNode;

  export { leftChannelAnalyzer, rightChannelAnalyzer };
</script>

<script lang="ts">
  import { aCtx, paused, volumeMultiplier } from "$lib/stores";
  import { onMount } from "svelte";
  import Region from "./Region.svelte";

  let lChannelLoudness = 0;
  let rChannelLoudness = 0;

  let lChannelDataArr = new Uint8Array(0);
  let rChannelDataArr = new Uint8Array(0);

  onMount(() => {
    leftChannelAnalyzer = $aCtx!.createAnalyser();
    leftChannelAnalyzer.fftSize = 256;

    rightChannelAnalyzer = $aCtx!.createAnalyser();
    rightChannelAnalyzer.fftSize = 256;

    lChannelDataArr = new Uint8Array(leftChannelAnalyzer.frequencyBinCount);
    rChannelDataArr = new Uint8Array(rightChannelAnalyzer.frequencyBinCount);

    return () => {
      cancelAnimationFrame(animationRequestId);
      leftChannelAnalyzer.disconnect();
      rightChannelAnalyzer.disconnect();
    };
  });

  let animationRequestId = 0;

  const draw = () => {
    if ($paused) return;
    leftChannelAnalyzer.getByteFrequencyData(lChannelDataArr);
    rightChannelAnalyzer.getByteFrequencyData(rChannelDataArr);
    lChannelLoudness =
      lChannelDataArr.reduce((acc, curr) => acc + curr, 0) /
      lChannelDataArr.length;
    rChannelLoudness =
      rChannelDataArr.reduce((acc, curr) => acc + curr, 0) /
      rChannelDataArr.length;

    lChannelLoudness *= $volumeMultiplier;
    rChannelLoudness *= $volumeMultiplier;

    requestAnimationFrame(draw);
  };

  $: if ($paused) {
    lChannelLoudness = 0;
    rChannelLoudness = 0;
    cancelAnimationFrame(animationRequestId);
  }

  $: if (!$paused) {
    animationRequestId = requestAnimationFrame(draw);
  }
</script>

<Region class="flex justify-center gap-0.5">
  <div class="w-3 rounded-sm bg-zinc-950 shadow-sm overflow-clip">
    <div
      class="w-full h-full bg-gradient-to-b from-red-500 via-yellow-300 to-green-400 clip"
      style="--loudness: {lChannelLoudness / 256};"
    ></div>
  </div>
  <div class="w-3 rounded-sm bg-zinc-950 shadow-sm overflow-clip">
    <div
      class="w-full h-full bg-gradient-to-b from-red-500 via-yellow-300 to-green-400 clip"
      style="--loudness: {rChannelLoudness / 256};"
    ></div>
  </div>
  <input
    type="range"
    min="0"
    max="1"
    step="0.001"
    bind:value={$volumeMultiplier}
  />
</Region>

<style>
  .clip {
    clip-path: inset(calc((1 - var(--loudness)) * 100%) 0 0 0);
  }

  input {
    writing-mode: vertical-lr;
    direction: rtl;
    appearance: slider-vertical;
  }
</style>
