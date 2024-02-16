<script lang="ts">
  import Region from "$lib/components/Region.svelte";
  import { videoClips, audioClips, safeRes } from "$lib/stores";
  import IconButton from "../IconButton.svelte";
  import ScalarSetting from "./ScalarSetting.svelte";
  import ResetIcon from "$lib/icon/Reset.svelte";
  import TopOrigin from "$lib/icon/TopOrigin.svelte";
  import LeftOrigin from "$lib/icon/LeftOrigin.svelte";
  import CenterOrigin from "$lib/icon/CenterOrigin.svelte";
  import RightOrigin from "$lib/icon/RightOrigin.svelte";
  import BottomOrigin from "$lib/icon/BottomOrigin.svelte";
  import TransformButton from "./TransformButton.svelte";
  import UnlinkIcon from "$lib/icon/UnlinkIcon.svelte";
  import LinkIcon from "$lib/icon/LinkIcon.svelte";

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
</script>

<Region class="row-start-2 overflow-scroll [scrollbar-width:thin]">
  <header
    class="flex justify-between pb-2 mb-2 border-b border-zinc-300 dark:border-zinc-800 flex-wrap"
  >
    <p>{clip.media.title}</p>
    <p>{clip.media.duration.toPrecision(3)}s</p>
    <p>{clip.media.dimensions[0]}px x {clip.media.dimensions[1]}px</p>
    <p class="text-zinc-500">{clip.uuid}</p>
  </header>

  {#if type === "video" || type === "image"}
    <section
      class="pb-2 mb-2 border-b border-zinc-300 dark:border-zinc-800 w-full"
    >
      <header class="col-start-1 grid grid-cols-subgrid">
        <div class="flex justify-between">
          <h2 class="text-sm font-mono">Positioning</h2>
          <IconButton
            alt="Reset clip positioning"
            on:click={() => {
              matrix[0].staticVal = matrix[3].staticVal = 1;
              matrix[4].staticVal = matrix[5].staticVal = 0;
              matrix[1] = matrix[2] = 0;
              matrix[0].curves = matrix[3].curves = [];
              matrix[4].curves = matrix[5].curves = [];
              origin = [0.5, 0.5];
            }}
          >
            <ResetIcon />
          </IconButton>
        </div>
      </header>

      <section class="w-full col-start-1 flex flex-wrap gap-2 pb-2 mb-2">
        <h3 class="w-full">Transform Origin</h3>
        <div
          class="relative grid grid-cols-3 grid-rows-3 p-0.5 w-16 h-16 rounded-md bg-zinc-100 dark:bg-zinc-800/15"
        >
          <TransformButton bind:origin value={[0, 0]} />
          <TransformButton bind:origin value={[0.5, 0]}>
            <TopOrigin />
          </TransformButton>
          <TransformButton bind:origin value={[1, 0]} />
          <TransformButton bind:origin value={[0, 0.5]}>
            <LeftOrigin />
          </TransformButton>
          <TransformButton bind:origin value={[0.5, 0.5]}>
            <CenterOrigin />
          </TransformButton>
          <TransformButton bind:origin value={[1, 0.5]}>
            <RightOrigin />
          </TransformButton>
          <TransformButton bind:origin value={[0, 1]} />
          <TransformButton bind:origin value={[0.5, 1]}>
            <BottomOrigin />
          </TransformButton>
          <TransformButton bind:origin value={[1, 1]} />
          <div
            class="w-1 h-1 bg-zinc-950/40 dark:bg-zinc-100/40 rounded-sm absolute transform -translate-x-1/2 -translate-y-1/2"
            style:top="{12 + origin[1] * 40}px"
            style:left="{12 + origin[0] * 40}px"
          />
        </div>
        <div class="grid grid-cols-[min-content,1fr] gap-2 h-fit">
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
      </section>

      <div class="col-start-1 grid grid-cols-[1fr,32px,1fr,32px] gap-2">
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
          automationClass="row-start-3 col-start-1 col-span-4"
          dynamicBounds
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
          automationClass="row-start-3 col-start-1 col-span-4"
          dynamicBounds
        />
        <div
          class="col-start-2 row-start-1 row-span-2 flex flex-col justify-center gap-1"
        >
          <div
            class="w-1/2 h-2 rounded-tr-md border-t border-r {isPositionLinked
              ? 'border-solid'
              : 'border-dashed'} border-zinc-700"
          />
          <IconButton
            alt="Link position"
            on:click={() => (isPositionLinked = !isPositionLinked)}
          >
            {#if isPositionLinked}
              <UnlinkIcon />
            {:else}
              <LinkIcon />
            {/if}
          </IconButton>

          <div
            class="w-1/2 h-2 rounded-br-md border-b border-r {isPositionLinked
              ? 'border-solid'
              : 'border-dashed'} border-zinc-700"
          />
        </div>
        <ScalarSetting
          supportsAutomation
          class="col-start-3 row-start-1"
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
          automationClass="row-start-3 col-start-1 col-span-4"
          dynamicBounds
        />
        <ScalarSetting
          supportsAutomation
          class="col-start-3 row-start-2"
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
          automationClass="row-start-3 col-start-1 col-span-4"
          dynamicBounds
        />
        <div
          class="col-start-4 row-start-1 row-span-2 flex flex-col justify-center gap-1"
        >
          <div
            class="w-1/2 h-2 rounded-tr-md border-t border-r {isScaleLinked
              ? 'border-solid'
              : 'border-dashed'} border-zinc-700"
          />
          <IconButton
            alt="Link position"
            on:click={() => (isScaleLinked = !isScaleLinked)}
          >
            {#if isScaleLinked}
              <UnlinkIcon />
            {:else}
              <LinkIcon />
            {/if}
          </IconButton>
          <div
            class="w-1/2 h-2 rounded-br-md border-b border-r {isScaleLinked
              ? 'border-solid'
              : 'border-dashed'} border-zinc-700"
          />
        </div>
      </div>
    </section>
  {/if}
  {#if type !== "image"}
    <section
      class="pb-2 mb-2 border-b border-zinc-300 dark:border-zinc-800 space-y-3 w-full"
    >
      <header class="col-start-1 grid grid-cols-subgrid">
        <div class="flex justify-between">
          <h2 class="text-sm font-mono">Audio</h2>
          <IconButton
            alt="Reset audio settings"
            on:click={() => {
              volume.staticVal = 1;
              volume.curves = [];
              isVolumeAutomationVisible = false;
            }}
          >
            <ResetIcon />
          </IconButton>
        </div>
      </header>

      <section
        class="col-start-1 grid grid-cols-[min-content,min-content,24px] gap-2 h-fit w-full"
      >
        <ScalarSetting
          useSubgrid
          supportsAutomation
          name="Volume"
          disabled={volume.curves.length > 0}
          bind:scalar={volume.staticVal}
          props={{ min: 0, max: 1, step: 0.01 }}
          strictBounds
          defaultVal={1}
          bind:automation={volume}
          bind:isAutomationVisible={isVolumeAutomationVisible}
        />

        <ScalarSetting
          useSubgrid
          name="Pan"
          bind:scalar={pan}
          props={{ min: -1, max: 1, step: 0.01 }}
          strictBounds
        />
      </section>
    </section>
  {/if}
</Region>
