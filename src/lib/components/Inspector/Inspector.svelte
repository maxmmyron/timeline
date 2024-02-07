<script lang="ts">
  import Region from "$lib/components/Region.svelte";
  import { videoClips, audioClips, safeRes } from "$lib/stores";
  import ScalarSetting from "./ScalarSetting.svelte";

  export let uuid: string;
  export let type: App.MediaType;

  let isScaleLinked = false;
  let isPositionLinked = false;

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

<Region class="row-start-2 overflow-scroll [scrollbar-width:thin]">
  <header
    class="flex justify-between pb-2 mb-2 border-b border-zinc-300 dark:border-zinc-800 flex-wrap"
  >
    <p>{clip.media.title}</p>
    <p>{clip.media.duration.toPrecision(3)}s</p>
    <p class="text-zinc-500">{clip.uuid}</p>
  </header>

  {#if type === "video" || type === "image"}
    <section
      class="pb-2 mb-2 border-b border-zinc-300 dark:border-zinc-800 space-y-3 grid grid-cols-[1fr,24px] gap-1 w-full"
    >
      <header class="col-start-1 grid grid-cols-subgrid">
        <div class="flex justify-between">
          <h2 class="text-sm font-mono">Transforms</h2>
          <button
            class="bg-zinc-800 p-1 h-5 rounded-md shadow-md flex flex-col items-center justify-center border border-zinc-700"
            on:click={() => (matrix = [1, 0, 0, 1, 0, 0])}>↻</button
          >
        </div>
      </header>

      <section class="col-span-full grid grid-cols-subgrid gap-2">
        <p class="col-start-1">Scale</p>
        <ScalarSetting
          class="col-start-1"
          name="X"
          bind:scalar={matrix[0]}
          props={{ min: 0, max: 6, step: 0.01 }}
          on:change={() => isScaleLinked && (matrix[3] = matrix[0])}
          defaultVal={1}
        />
        <ScalarSetting
          class="col-start-1"
          name="Y"
          bind:scalar={matrix[3]}
          props={{ min: 0, max: 6, step: 0.01 }}
          on:change={() => isScaleLinked && (matrix[0] = matrix[3])}
          defaultVal={1}
        />
        <div
          class="col-start-2 row-start-2 row-span-2 flex flex-col justify-center gap-1"
        >
          <div
            class="w-1/2 h-2 rounded-tr-md border-t border-r {isScaleLinked
              ? 'border-solid'
              : 'border-dashed'} border-zinc-700"
          />
          <button
            class="bg-zinc-800 p-1 h-5 rounded-md shadow-md flex flex-col items-center justify-center border border-zinc-700"
            class:bg-zinc-900={isScaleLinked}
            on:click={() => (isScaleLinked = !isScaleLinked)}
          >
            🔗
          </button>
          <div
            class="w-1/2 h-2 rounded-br-md border-b border-r {isScaleLinked
              ? 'border-solid'
              : 'border-dashed'} border-zinc-700"
          />
        </div>
      </section>

      <section class="col-span-full grid grid-cols-subgrid gap-2">
        <p>Translate</p>
        <ScalarSetting
          class="col-start-1"
          name="X"
          bind:scalar={matrix[4]}
          props={{ min: -$safeRes[0] / 2, max: $safeRes[0] / 2, step: 0.01 }}
          on:change={() => isPositionLinked && (matrix[5] = matrix[4])}
        />
        <ScalarSetting
          name="Y"
          class="col-start-1"
          bind:scalar={matrix[5]}
          props={{ min: -$safeRes[1] / 2, max: $safeRes[1] / 2, step: 0.01 }}
          on:change={() => isPositionLinked && (matrix[4] = matrix[5])}
        />
        <div
          class="col-start-2 row-start-2 row-span-2 flex flex-col justify-center gap-1"
        >
          <div
            class="w-1/2 h-2 rounded-tr-md border-t border-r {isPositionLinked
              ? 'border-solid'
              : 'border-dashed'} border-zinc-700"
          />
          <button
            class="bg-zinc-800 p-1 h-5 rounded-md shadow-md flex flex-col items-center justify-center border border-zinc-700"
            class:bg-zinc-900={isPositionLinked}
            on:click={() => (isPositionLinked = !isPositionLinked)}
          >
            🔗
          </button>
          <div
            class="w-1/2 h-2 rounded-br-md border-b border-r {isPositionLinked
              ? 'border-solid'
              : 'border-dashed'} border-zinc-700"
          />
        </div>
      </section>
    </section>
  {/if}
  {#if type !== "image"}
    <section
      class="pb-2 mb-2 border-b border-zinc-300 dark:border-zinc-800 space-y-3 grid grid-cols-[1fr,24px] gap-1 w-full"
    >
      <header class="col-start-1 grid grid-cols-subgrid">
        <div class="flex justify-between">
          <h2 class="text-sm font-mono">Audio</h2>
          <button
            class="bg-zinc-800 p-1 h-5 rounded-md shadow-md flex flex-col items-center justify-center border border-zinc-700"
            on:click={() => {
              volume = 1;
              pan = 0;
            }}>↻</button
          >
        </div>
      </header>

      <section class="col-start-1 space-y-2">
        <ScalarSetting
          name="Volume"
          bind:scalar={volume}
          props={{ min: 0, max: 1, step: 0.01 }}
          strictBounds
          defaultVal={1}
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
