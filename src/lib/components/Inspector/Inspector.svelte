<script lang="ts">
  import Region from "$lib/components/Region.svelte";
  import { videoClips, audioClips, safeRes } from "$lib/stores";
  import IconButton from "../IconButton.svelte";
  import ScalarSetting from "./ScalarSetting.svelte";
  import TransformButton from "./TransformButton.svelte";
  import AutomationPanel from "./AutomationPanel.svelte";
  import StaticRangeSetting from "./StaticRangeSetting.svelte";

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
  let origin = clip.origin;

  $: updateProp("matrix", matrix);
  $: updateProp("volume", volume);
  $: updateProp("pan", pan);
  $: updateProp("origin", origin);

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

  let isVolumeAutomationVisible = false;

  /**
   * An array containing the visibility state of the automation editor for each
   * scalar setting.
   */
  let visibleMatrixAutomation = [false, false, false, false, false, false];

  let currentAutomation: 0 | 3 | 4 | 5 | -1;
  $: currentAutomation = visibleMatrixAutomation.findIndex((v) => v) as
    | 0
    | 3
    | 4
    | 5
    | -1;

  $: automationOpen = currentAutomation !== -1 || isVolumeAutomationVisible;
</script>

<Region
  class="row-start-2 overflow-scroll [scrollbar-width:thin] h-full border-none !bg-transparent grid grid-rows-[auto,200px]"
>
  <main
    class="row-start-1 {automationOpen
      ? 'row-span-1'
      : 'row-span-2'} overflow-scroll"
  >
    <header
      class="flex justify-between pb-4 mb-3 border-b border-zinc-300 dark:border-zinc-800 flex-wrap"
    >
      <h2 class="text-zinc-300 overflow-clip text-ellipsis">
        {clip.media.title}
      </h2>
    </header>

    <section class="pb-4 mb-3 border-b border-zinc-800 space-y-3">
      <h3 class="text-zinc-400">Info</h3>
      <div class="grid grid-cols-3 gap-y-3">
        <p class="text-zinc-500">length</p>
        <p class="col-span-2">{clip.media.duration.toPrecision(3)}s</p>
        <p class="text-zinc-500">dimensions</p>
        <p class="col-span-2">
          {clip.media.dimensions[0]}px x {clip.media.dimensions[1]}px
        </p>
        <p class="text-zinc-500">clip uuid</p>
        <p class="col-span-2">{clip.uuid}</p>
      </div>
    </section>

    {#if type === "video" || type === "image"}
      <section class="pb-4 mb-3 border-b border-zinc-800 w-full space-y-3">
        <h3 class="text-zinc-400">Transforms</h3>

        <div class="grid grid-cols-5 gap-x-3 items-baseline">
          <h3 class="text-zinc-500">origin</h3>
          <div class="flex gap-3 w-full col-span-4">
            <div
              class="relative grid grid-cols-3 grid-rows-3 p-0.5 w-16 h-16 rounded-md bg-zinc-100 bg-zinc-925"
            >
              <TransformButton bind:origin value={[0, 0]} />
              <TransformButton name="TopOrigin" bind:origin value={[0.5, 0]} />
              <TransformButton bind:origin value={[1, 0]} />
              <TransformButton name="LeftOrigin" bind:origin value={[0, 0.5]} />
              <TransformButton
                name="CenterOrigin"
                bind:origin
                value={[0.5, 0.5]}
              />
              <TransformButton
                name="RightOrigin"
                bind:origin
                value={[1, 0.5]}
              />
              <TransformButton bind:origin value={[0, 1]} />
              <TransformButton
                name="BottomOrigin"
                bind:origin
                value={[0.5, 1]}
              />
              <TransformButton bind:origin value={[1, 1]} />
              <div
                class="w-1 h-1 bg-zinc-950/40 dark:bg-zinc-100/40 rounded-sm absolute transform -translate-x-1/2 -translate-y-1/2"
                style:top="{12 + origin[1] * 40}px"
                style:left="{12 + origin[0] * 40}px"
              />
            </div>
            <div
              class="grid grid-cols-[min-content,1fr] gap-x-2 gap-y-3 h-full"
            >
              <ScalarSetting
                useSubgrid
                class="col-start-1"
                name="Left"
                bind:scalar={origin[0]}
                props={{ min: 0, max: 1, step: 0.01 }}
                defaultVal={0.5}
              />
              <ScalarSetting
                useSubgrid
                class="col-start-1"
                name="Top"
                bind:scalar={origin[1]}
                props={{ min: 0, max: 1, step: 0.01 }}
                defaultVal={0.5}
              />
            </div>
          </div>
        </div>

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
              on:change={() => {
                if (
                  !isScaleLinked ||
                  matrix[0].curves.length !== 0 ||
                  matrix[3].curves.length !== 0
                )
                  return;
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
                  !isScaleLinked ||
                  matrix[0].curves.length !== 0 ||
                  matrix[3].curves.length !== 0
                )
                  return;
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
    {#if type !== "image"}
      <div class="pb-4 mb-3 border-b border-zinc-800 w-full space-y-3">
        <h3 class="text-zinc-400">Audio</h3>

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

        <div class="grid grid-cols-5 gap-x-3 items-baseline">
          <h3 class="text-zinc-500">Pan</h3>
          <StaticRangeSetting
            class="col-span-3"
            bind:scalar={pan}
            props={{ min: -1, max: 1, step: 0.01 }}
          />
        </div>
      </div>
    {/if}
  </main>

  {#if automationOpen}
    <div class="row-start-2 border-t border-zinc-800 pt-2">
      {#if currentAutomation !== -1}
        <h3 class="text-zinc-400">
          Automation: {matrix[currentAutomation].type}
        </h3>
        <AutomationPanel
          bind:automation={matrix[currentAutomation]}
          dynamicBounds
        />
      {/if}
      {#if isVolumeAutomationVisible}
        <h3 class="text-zinc-400">Automation: Volume</h3>
        <AutomationPanel bind:automation={volume} />
      {/if}
    </div>
  {/if}
</Region>
