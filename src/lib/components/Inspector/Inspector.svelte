<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import Region from "$lib/components/Region.svelte";
  import { selected, videoClips, audioClips } from "$lib/stores";

  /**
   * The UUID/type pair of the currently selected clip. This is assumed to be
   * non-null.
   */
  $: [selectedUUID, selectedType] = $selected as [string, "video" | "audio"];

  $: clipArr = selectedType === "audio" ? $audioClips : $videoClips;
  $: clip = clipArr.find((c) => c.uuid === selectedUUID) as App.Clip;
  $: matrix = clip.matrix;

  onMount(() => {
    if ($selected === null)
      throw new Error("Inspector has mounted without a selected clip.");
  });

  // we use this event to forward matrix changes to the video handler, since
  // it won't directly react to those changes itself
  const dispatcher = createEventDispatcher<{
    matrixChange: App.Matrix;
  }>();

  // dispatch a "matrixChange" event whenever the matrix changes
  $: matrix, matrixChange();

  /**
   * Emits a new matrixChange event. The detail parameter of the CustomEvent
   * interface represents the new matrix of the clip.
   */
  const matrixChange = () => {
    if (!clip) return;
    // don't emit if the selected clip is audio, because the video handler
    // doesn't care about audio clips' matrices
    if (selectedType === "audio") return;
    dispatcher("matrixChange", clip.matrix);
  };
</script>

<Region class="row-start-2">
  <header
    class="flex justify-between pb-2 mb-2 border-b border-zinc-300 dark:border-zinc-800 flex-wrap"
  >
    <p>{clip.media.title}</p>
    <p>{clip.media.duration.toPrecision(3)}s</p>
    <p class="text-zinc-500">{clip.uuid}</p>
  </header>

  {#if selectedType === "video"}
    <section
      class="pb-2 mb-2 border-b border-zinc-300 dark:border-zinc-800 space-y-3"
    >
      <header class="flex justify-between">
        <h2 class="text-sm font-mono">Transforms</h2>
        <button on:click={() => (clip.matrix = [1, 0, 0, 1, 0, 0])}>
          reset
        </button>
      </header>
      <section class="space-y-2">
        <p>Scale</p>
        <label class="flex items-center gap-1">
          <p>X</p>
          <input
            class="border border-zinc-300 rounded-md dark:bg-zinc-900 dark:border-zinc-800"
            type="number"
            bind:value={matrix[0]}
          />
        </label>
        <label class="flex items-center gap-1">
          <p>Y</p>
          <input
            class="border border-zinc-300 rounded-md dark:bg-zinc-900 dark:border-zinc-800"
            type="number"
            bind:value={matrix[3]}
          />
        </label>
      </section>

      <section class="space-y-2">
        <p>Translate</p>
        <label class="flex items-center gap-1">
          <p>X</p>
          <input
            class="border border-zinc-300 rounded-md dark:bg-zinc-900 dark:border-zinc-800"
            type="number"
            bind:value={matrix[4]}
          />
        </label>
        <label class="flex items-center gap-1">
          <p>Y</p>
          <input
            class="border border-zinc-300 rounded-md dark:bg-zinc-900 dark:border-zinc-800"
            type="number"
            bind:value={matrix[5]}
          />
        </label>
      </section>
    </section>
  {/if}
</Region>
