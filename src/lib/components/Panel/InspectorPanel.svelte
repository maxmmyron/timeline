<script lang="ts">
  import { videoClips, audioClips } from "$lib/stores";
  import IconButton from "../IconButton.svelte";
  import ScalarSetting from "./Inspector/ScalarSetting.svelte";
  import AutomationGraph from "./Inspector/AutomationGraph.svelte";
  import StaticRangeSetting from "./Inspector/StaticRangeSetting.svelte";

  export let uuid: string;
  export let type: App.MediaType;

  let isScaleLinked = false;
  let isPositionLinked = false;

  const clipArr = type === "audio" ? $audioClips : $videoClips;
  const clipIdx = clipArr.findIndex((c) => c.uuid === uuid);
  let clip = clipArr[clipIdx] as
    | App.Clip<"video">
    | App.Clip<"audio">
    | App.Clip<"image">;

  let matrix = clip.type !== "audio" ? clip.matrix : null;
  let volume = clip.type === "audio" ? clip.volume : null;
  let pan = clip.type === "audio" ? clip.pan : null;

  $: if (matrix) updateProp<"video" | "image">("matrix", matrix);
  $: if (volume) updateProp<"audio">("volume", volume);
  $: if (pan) updateProp<"audio">("pan", pan);

  /**
   * Updates a property of the current clip.
   * @param prop the property to update
   * @param val the new value
   * @param __type Internal use only: the type of the clip to update. Used for Typescript narrowing
   */
  const updateProp = <T extends App.MediaType>(
    prop: keyof App.Clip<T>,
    val: App.Clip<T>[keyof App.Clip<T>]
  ) => {
    if (clip.type !== "audio") {
      // @ts-ignore
      $videoClips[clipIdx][prop] = val;
    } else {
      // @ts-ignore
      $audioClips[clipIdx][prop] = val;
    }
  };

  let isVolumeAutomationVisible = false;

  /**
   * An array containing the visibility state of the automation editor for each
   * scalar setting.
   */
  let visibleMatrixAutomation = [false, false, false, false, false, false];

  let currentMatrixAutomation: 0 | 3 | 4 | 5 | -1;
  $: currentMatrixAutomation = visibleMatrixAutomation.findIndex((v) => v) as
    | 0
    | 3
    | 4
    | 5
    | -1;

  $: automationOpen =
    currentMatrixAutomation !== -1 || isVolumeAutomationVisible;
</script>

<main
  class="row-start-1 {automationOpen
    ? 'row-span-1'
    : 'row-span-2'} overflow-scroll p-2"
>
  <header
    class="flex justify-between pb-4 mb-3 border-b border-zinc-300 dark:border-zinc-800 flex-wrap"
  >
    <h2 class="text-zinc-300 overflow-clip text-ellipsis text-xs uppercase">
      {clip.media.title}
    </h2>
  </header>

  <section class="pb-4 mb-3 border-b border-zinc-800 space-y-3">
    <h3 class="text-zinc-400">Info</h3>
    <div class="grid grid-cols-3 gap-y-3">
      <p class="text-zinc-500">length</p>
      {#if clip.type !== "image"}
        <p class="col-span-2">{clip.media.duration.toPrecision(3)}s</p>
      {:else}
        <p class="col-span-2">N/A</p>
      {/if}
      {#if clip.type !== "audio"}
        <p class="text-zinc-500">dimensions</p>
        <p class="col-span-2">
          {clip.media.dimensions[0]}px x {clip.media.dimensions[1]}px
        </p>
      {/if}
      <p class="text-zinc-500">clip uuid</p>
      <p class="col-span-2">{clip.uuid}</p>
    </div>
  </section>

  {#if matrix && (clip.type === "video" || clip.type === "image")}
    <section class="pb-4 mb-3 border-b border-zinc-800 w-full space-y-3">
      <h3 class="text-zinc-400">Transforms</h3>

      <div class="grid grid-cols-5 gap-x-3 items-baseline">
        <h3 class="text-zinc-500">position</h3>
        <div class="flex gap-3">
          <ScalarSetting
            supportsAutomation
            class="col-start-1 row-start-1"
            name="X"
            bind:scalar={matrix[4].staticVal}
            on:change={() => {
              if (
                !isPositionLinked ||
                matrix[4].curves.length !== 0 ||
                matrix[5].curves.length !== 0
              )
                return;
              matrix[5].staticVal = matrix[4].staticVal;
            }}
            bind:automation={matrix[4]}
            mag={1}
            bind:isAutomationVisible={visibleMatrixAutomation[4]}
            on:automationEditorOpen={(e) => {
              visibleMatrixAutomation = [
                false,
                false,
                false,
                false,
                true,
                false,
              ];
            }}
          />
          <ScalarSetting
            supportsAutomation
            name="Y"
            class="col-start-1 row-start-2"
            bind:scalar={matrix[5].staticVal}
            on:change={() => {
              if (
                !isPositionLinked ||
                matrix[4].curves.length !== 0 ||
                matrix[5].curves.length !== 0
              )
                return;
              matrix[4].staticVal = matrix[5].staticVal;
            }}
            bind:automation={matrix[5]}
            mag={1}
            bind:isAutomationVisible={visibleMatrixAutomation[5]}
            on:automationEditorOpen={(e) => {
              visibleMatrixAutomation = [
                false,
                false,
                false,
                false,
                false,
                true,
              ];
            }}
          />
          <IconButton
            name={isPositionLinked ? "Unlink" : "Link"}
            alt="Link position"
            on:click={() => (isPositionLinked = !isPositionLinked)}
            toggles
          />
        </div>
      </div>

      <div class="grid grid-cols-5 gap-x-3 items-baseline">
        <h3 class="text-zinc-500">scale</h3>
        <div class="flex gap-3">
          <ScalarSetting
            supportsAutomation
            name="W"
            bind:scalar={matrix[0].staticVal}
            props={{ min: 0, max: 6, step: 0.01 }}
            on:input={() => {
              if (
                isScaleLinked &&
                matrix[0].curves.length === 0 &&
                matrix[3].curves.length === 0
              )
                matrix[3].staticVal = matrix[0].staticVal;
            }}
            bind:automation={matrix[0]}
            defaultVal={1}
            bind:isAutomationVisible={visibleMatrixAutomation[0]}
            on:automationEditorOpen={(e) => {
              visibleMatrixAutomation = [
                true,
                false,
                false,
                false,
                false,
                false,
              ];
            }}
          />
          <ScalarSetting
            supportsAutomation
            name="H"
            bind:scalar={matrix[3].staticVal}
            props={{ min: 0, max: 6, step: 0.01 }}
            on:change={() => {
              if (
                isScaleLinked &&
                matrix[0].curves.length === 0 &&
                matrix[3].curves.length === 0
              )
                matrix[0].staticVal = matrix[3].staticVal;
            }}
            bind:automation={matrix[3]}
            defaultVal={1}
            bind:isAutomationVisible={visibleMatrixAutomation[3]}
            on:automationEditorOpen={(e) => {
              visibleMatrixAutomation = [
                false,
                false,
                false,
                true,
                false,
                false,
              ];
            }}
          />
          <IconButton
            name={isScaleLinked ? "Unlink" : "Link"}
            alt="Link position"
            on:click={() => (isScaleLinked = !isScaleLinked)}
            toggles
            showOutline
          />
        </div>
      </div>
    </section>
  {/if}
  {#if clip.type === "audio"}
    <div class="pb-4 mb-3 border-b border-zinc-800 w-full space-y-3">
      <h3 class="text-zinc-400">Audio</h3>

      {#if volume}
        <div class="grid grid-cols-5 gap-x-3 items-baseline">
          <h3 class="text-zinc-500">Volume</h3>
          <ScalarSetting
            supportsAutomation
            disabled={volume.curves.length > 0}
            bind:scalar={volume.staticVal}
            props={{ min: 0, max: 1, step: 0.01 }}
            defaultVal={1}
            bind:automation={volume}
            bind:isAutomationVisible={isVolumeAutomationVisible}
          />
        </div>
      {/if}

      {#if pan}
        <div class="grid grid-cols-5 gap-x-3 items-baseline">
          <h3 class="text-zinc-500">Pan</h3>
          <StaticRangeSetting
            class="col-span-3"
            bind:scalar={pan}
            props={{ min: -1, max: 1, step: 0.01 }}
          />
        </div>
      {/if}
    </div>
  {/if}
</main>

{#if automationOpen && matrix && volume}
  <div class="row-start-2 border-t border-zinc-800 pt-2">
    <div class="flex justify-between items-center gap-2">
      <h3 class="text-zinc-400">
        Automation: {currentMatrixAutomation !== -1
          ? matrix[currentMatrixAutomation].type
          : "Volume"}
      </h3>
      <IconButton
        name="Close"
        alt="Close automation panel"
        on:click={(e) => {
          visibleMatrixAutomation[currentMatrixAutomation] = false;
          isVolumeAutomationVisible = false;
        }}
      />
    </div>
    {#if currentMatrixAutomation !== -1}
      <AutomationGraph
        bind:automation={matrix[currentMatrixAutomation]}
        dynamicBounds
      />
    {:else}
      <AutomationGraph bind:automation={volume} />
    {/if}
  </div>
{/if}
