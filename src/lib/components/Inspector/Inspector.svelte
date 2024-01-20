<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import Region from "$lib/components/Region.svelte";
  import { selected, videoClips } from "$lib/stores";

  let clip: App.Clip = $videoClips.find(
    (c) => c.uuid === $selected
  ) as App.Clip;

  onMount(() => {
    if ($selected === null)
      throw new Error("Inspector has mounted without a selected clip.");
  });

  export let scaleX = 1;
  export let scaleY = 1;
  export let translateX = 0;
  export let translateY = 0;

  $: clip.matrix = [
    scaleX ?? 1,
    0,
    0,
    scaleY ?? 1,
    translateX ?? 0,
    translateY ?? 0,
  ] as App.Matrix;

  // we use this event to forward matrix changes to the video handler, since
  // it won't directly react to those changes itself
  const matrixDispatcher = createEventDispatcher();

  // dispatch a "matrixChange" event whenever the matrix changes
  $: clip.matrix, matrixChange();

  /**
   * Emits a new matrixChange event. The detail parameter of the CustomEvent
   * interface represents the new matrix of the clip.
   */
  const matrixChange = () => {
    matrixDispatcher("matrixChange", clip.matrix);
  };
</script>

<Region class="flex-grow">
  <header class="flex justify-between pb-1 mb-2 border-b border-gray-300">
    <p class="text-sm font-mono text-gray-950">{clip.media.title}</p>
    <p class="text-sm font-mono text-gray-950">
      {clip.media.duration.toPrecision(3)}s
    </p>
  </header>

  <section class="pb-1 mb-2 border-b border-gray-300">
    <header class="flex justify-between">
      <h2 class="text-sm font-mono">Transforms</h2>
      <button on:click={() => (clip.matrix = [1, 0, 0, 1, 0, 0])}>
        reset
      </button>
    </header>
    <p>Scale</p>
    <label class="setting">
      <p>X</p>
      <input type="number" bind:value={scaleX} />
    </label>
    <label class="setting">
      <p>Y</p>
      <input type="number" bind:value={scaleY} />
    </label>

    <p>Translate</p>
    <label class="setting">
      <p>X</p>
      <input type="number" bind:value={translateX} />
    </label>
    <label class="setting">
      <p>Y</p>
      <input type="number" bind:value={translateY} />
    </label>
  </section>
</Region>
