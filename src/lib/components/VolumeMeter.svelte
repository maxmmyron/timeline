<script lang="ts">
  import { aCtx, audioAnalyser, paused } from "$lib/stores";
  import { onMount } from "svelte";
  import Region from "./Region.svelte";

  let loudnessLeft = 0;
  let loudnessRight = 0;

  let bufferLength: number;
  let dataArray: Uint8Array;

  onMount(() => {
    $audioAnalyser = $aCtx!.createAnalyser();
    $audioAnalyser.fftSize = 256;

    bufferLength = $audioAnalyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    return () => {
      cancelAnimationFrame(animationRequestId);
      $audioAnalyser!.disconnect();
    };
  });

  let animationRequestId = 0;

  const draw = () => {
    if ($paused || !$audioAnalyser) return;
    $audioAnalyser.getByteFrequencyData(dataArray);

    // TODO: use createChannelSplitter to get left and right channels
    loudnessLeft =
      dataArray.reduce((acc, curr) => acc + curr, 0) / dataArray.length;
    loudnessRight =
      dataArray.reduce((acc, curr) => acc + curr, 0) / dataArray.length;

    requestAnimationFrame(draw);
  };

  $: if ($paused) {
    loudnessLeft = 0;
    loudnessRight = 0;
    cancelAnimationFrame(animationRequestId);
  }

  $: if (!$paused) {
    console.log("Starting animation");
    animationRequestId = requestAnimationFrame(draw);
  }
</script>

<Region class="flex justify-center gap-0.5">
  <div class="w-3 rounded-sm bg-zinc-950 shadow-sm overflow-clip">
    <div
      class="w-full h-full bg-gradient-to-b from-red-500 via-yellow-300 to-green-400 clip"
      style="--loudness: {loudnessLeft / 256};"
    ></div>
  </div>
  <div class="w-3 rounded-sm bg-zinc-950 shadow-sm overflow-clip">
    <div
      class="w-full h-full bg-gradient-to-b from-red-500 via-yellow-300 to-green-400 clip"
      style="--loudness: {loudnessRight / 256};"
    ></div>
  </div>
</Region>

<style>
  .clip {
    clip-path: inset(calc((1 - var(--loudness)) * 100%) 0 0 0);
  }
</style>
