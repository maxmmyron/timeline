<script lang="ts">
  import Region from "$lib/components/Region.svelte";
  import { videoClips, audioClips, safeRes } from "$lib/stores";
  import ScalarSetting from "./ScalarSetting.svelte";

  export let uuid: string;
  export let type: App.MediaType;

  const clipArr = type === "audio" ? $audioClips : $videoClips;
  const clipIdx = clipArr.findIndex((c) => c.uuid === uuid);
  let clip = clipArr[clipIdx];

  let matrix = clip.matrix;
  let volume = clip.volume;
  let pan = clip.pan;

  $: updateProp("matrix", matrix);
  $: updateProp("volume", volume);
  $: updateProp("pan", pan);

  const updateProp = <T extends keyof typeof clip>(
    prop: T,
    val: (typeof clip)[T]
  ) => {
    if (type === "video" || type === "image") {
      $videoClips[clipIdx][prop] = val;
    } else {
      $audioClips[clipIdx][prop] = val;
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

  {#if type === "video" || type === "image"}
    <section
      class="pb-2 mb-2 border-b border-zinc-300 dark:border-zinc-800 space-y-3"
    >
      <header class="flex justify-between">
        <h2 class="text-sm font-mono">Transforms</h2>
        <button
          class="bg-zinc-800 p-1 h-5 rounded-md shadow-md flex flex-col items-center justify-center border border-zinc-700"
          on:click={() => (matrix = [1, 0, 0, 1, 0, 0])}>↻</button
        >
      </header>

      <section class="space-y-2">
        <p>Scale</p>
        <ScalarSetting
          name="X"
          bind:scalar={matrix[0]}
          props={{ min: 0, max: 6, step: 0.01 }}
        />
        <ScalarSetting
          name="Y"
          bind:scalar={matrix[3]}
          props={{ min: 0, max: 6, step: 0.01 }}
        />
      </section>

      <section class="space-y-2">
        <p>Translate</p>
        <ScalarSetting
          name="X"
          bind:scalar={matrix[4]}
          props={{ min: -$safeRes[0] / 2, max: $safeRes[0] / 2, step: 0.01 }}
        />
        <ScalarSetting
          name="Y"
          bind:scalar={matrix[5]}
          props={{ min: -$safeRes[1] / 2, max: $safeRes[1] / 2, step: 0.01 }}
        />
      </section>
    </section>
  {/if}
  {#if type !== "image"}
    <section
      class="pb-2 mb-2 border-b border-zinc-300 dark:border-zinc-800 space-y-3"
    >
      <header class="flex justify-between">
        <h2 class="text-sm font-mono">Audio</h2>
        <button
          class="bg-zinc-800 p-1 h-5 rounded-md shadow-md flex flex-col items-center justify-center border border-zinc-700"
          on:click={() => {
            volume = 1;
            pan = 0;
          }}>↻</button
        >
      </header>

      <section class="space-y-2">
        <ScalarSetting
          name="Volume"
          bind:scalar={volume}
          props={{ min: 0, max: 1, step: 0.01 }}
          strictBounds
        />
        <ScalarSetting
          name="Pan"
          bind:scalar={pan}
          props={{ min: -1, max: 1, step: 0.01 }}
          strictBounds
        />
      </section>
    </section>
  {/if}
</Region>
