<script lang="ts">
  import Region from "$lib/components/Region.svelte";
  import { videoClips, audioClips } from "$lib/stores";

  export let uuid: string;
  export let type: "video" | "audio";

  const clipArr = type === "audio" ? $audioClips : $videoClips;
  const clipIdx = clipArr.findIndex((c) => c.uuid === uuid);
  let clip = clipArr[clipIdx];

  let matrix = clip.matrix;
  let volume = clip.volume;

  $: matrix, updateClip();
  $: volume, updateClip();

  const updateClip = () => {
    clip = { ...clip, matrix, volume };

    if (type === "video") {
      $videoClips[clipIdx] = clip;
      $videoClips = $videoClips;
    } else {
      $audioClips[clipIdx] = clip;
      $audioClips = $audioClips;
    }
  };
</script>

<Region class="row-start-2 overflow-scroll">
  <header
    class="flex justify-between pb-2 mb-2 border-b border-zinc-300 dark:border-zinc-800 flex-wrap"
  >
    <p>{clip.media.title}</p>
    <p>{clip.media.duration.toPrecision(3)}s</p>
    <p class="text-zinc-500">{clip.uuid}</p>
  </header>

  {#if type === "video"}
    <section
      class="pb-2 mb-2 border-b border-zinc-300 dark:border-zinc-800 space-y-3"
    >
      <header class="flex justify-between">
        <h2 class="text-sm font-mono">Transforms</h2>
        <button
          on:click={() => {
            matrix = [1, 0, 0, 1, 0, 0];
            updateClip();
          }}
        >
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
            on:change={updateClip}
          />
        </label>
        <label class="flex items-center gap-1">
          <p>Y</p>
          <input
            class="border border-zinc-300 rounded-md dark:bg-zinc-900 dark:border-zinc-800"
            type="number"
            bind:value={matrix[3]}
            on:change={updateClip}
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
            on:change={updateClip}
          />
        </label>
        <label class="flex items-center gap-1">
          <p>Y</p>
          <input
            class="border border-zinc-300 rounded-md dark:bg-zinc-900 dark:border-zinc-800"
            type="number"
            bind:value={matrix[5]}
            on:change={updateClip}
          />
        </label>
      </section>
    </section>
  {/if}
  <section
    class="pb-2 mb-2 border-b border-zinc-300 dark:border-zinc-800 space-y-3"
  >
    <header class="flex justify-between">
      <h2 class="text-sm font-mono">Audio</h2>
      <button
        on:click={() => {
          volume = 1;
          updateClip();
        }}>reset</button
      >
    </header>

    <section class="space-y-2">
      <label class="flex items-center gap-1">
        <p>Volume</p>
        <input
          class="border border-zinc-300 rounded-md dark:bg-zinc-900 dark:border-zinc-800"
          type="range"
          min="0"
          max="1"
          step="0.01"
          bind:value={volume}
          on:change={updateClip}
        />
        <output><p>{volume}</p></output>
      </label>
    </section>
  </section>
</Region>
