<script>
  import { scale, time } from "$lib/stores";
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

<Region
  class="grid place-items-center grid-cols-3 gap-2 lg:col-start-1 lg:col-span-full lg:row-start-3 lg:row-span-1"
>
  <label class="flex gap-1">
    <button
      class="bg-zinc-800 p-1 w-5 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
      on:click={decrease}
    >
      <span>-</span>
    </button>
    <input type="range" min="0.02" max="5" step="0.001" bind:value={$scale} />
    <button
      class="bg-zinc-800 p-1 w-5 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
      on:click={increase}
    >
      <span>+</span>
    </button>
  </label>
  <Runtime time={$time} />
</Region>
