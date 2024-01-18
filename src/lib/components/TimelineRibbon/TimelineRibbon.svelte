<script>
  import { scale, time } from "$lib/stores";
  import Region from "../Region.svelte";
  import Runtime from "../Runtime.svelte";
</script>

<svelte:window
  on:keydown={(e) => {
    // ctrl shift + or -: zoom in or out
  }}
/>

<Region
  class="grid place-items-center grid-cols-3 gap-2 lg:col-start-1 lg:col-span-full lg:row-start-3 lg:row-span-1"
>
  <label class="flex gap-1">
    <p>Scale: {$scale.toFixed(1)}</p>
    <input type="range" min="0.1" max="4" step="0.1" bind:value={$scale} />
  </label>
  <Runtime time={$time} />
</Region>
