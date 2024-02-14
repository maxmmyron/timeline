<script lang="ts">
  import { onMount } from "svelte";
  import CloseIcon from "$lib/icon/CloseIcon.svelte";
  import IconButton from "../IconButton.svelte";
  import ScalarSetting from "./ScalarSetting.svelte";

  export let isAutomationVisible: boolean;
  export let automation: App.Automation;

  $: type = automation.type;
  $: uuid = automation.uuid;

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;

  let editContainerWidth = 0;
  let editContainerHeight = 0;

  let selectedIdx = -1;
  let activeIdx = -1;

  let initialMousePos: [number, number] = [0, 0];
  let initialNodePos: [number, number] = [0, 0];

  onMount(() => {
    if (automation.curves.length == 0) {
      automation.curves = [
        [0, automation.staticVal],
        [automation.duration, automation.staticVal],
      ];
    }

    ctx = canvas.getContext("2d");

    rerender();
  });

  const rerender = () => {
    if (!ctx) {
      throw new Error("Error mounting AutomationPanel: No canvas context.");
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const dur = automation.duration;
    for (let i = 0; i < automation.curves.length; i++) {
      const [x1, y1] = automation.curves[i];
      // if we're at the last point, use the previous point's Y value
      // (i.e. self)
      const [x2, y2] = automation.curves[i + 1] || [automation.duration, y1];

      ctx.beginPath();
      ctx.moveTo((x1 / dur) * canvas.width, (1 - y1) * canvas.height);
      ctx.lineTo((x2 / dur) * canvas.width, (1 - y2) * canvas.height);
      ctx.strokeStyle = "hsl(200, 0%, 25%)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  /**
   * Moves the point specified by the move index struct, based on the following
   * rules:
   * 1. if idx === 0 OR if idx === (len - 1) then we're moving the first/last
   *    point respectively; special case applies:
   *    - X value is static.
   *
   * 2. otherwise, we're moving a point along the curve:
   *    - X is dynamic, however is bounded by the previous and next point's X
   */
  const move = (e: MouseEvent) => {
    if (activeIdx === -1) return;

    let y = e.clientY - canvas.getBoundingClientRect().top;
    let normedY = normY(Math.min(Math.max(y, 0), editContainerHeight));

    // special case: first/last point
    if (activeIdx === 0) {
      automation.curves[activeIdx][1] = normedY;
      return;
    }
    if (activeIdx === automation.curves.length - 1) {
      automation.curves[activeIdx][1] = normedY;
      return;
    }

    // general case: move point along curve. we know we have at least one point
    // before and after the current point, so we can safely access them.

    let x = e.clientX - canvas.getBoundingClientRect().left;

    let normedX = normX(Math.min(Math.max(x, 0), editContainerWidth));

    // bound adjustedX to the previous and next point's X values
    let prevX = automation.curves[activeIdx - 1][0];
    let nextX = automation.curves[activeIdx + 1][0];
    let boundedX = Math.min(Math.max(normedX, prevX), nextX);

    // if shift is held, constrain movement to the axis with the greatest delta
    if (e.shiftKey) {
      if (Math.abs(x - initialMousePos[0]) > Math.abs(y - initialMousePos[1]))
        normedY = initialNodePos[1];
      else boundedX = initialNodePos[0];
    }

    automation.curves[activeIdx] = [boundedX, normedY];
  };

  const normX = (px: number) => px / editContainerWidth;
  const normY = (px: number) => 1 - px / editContainerHeight;
</script>

<svelte:window
  on:mousemove={(e) => {
    move(e);
    rerender();
  }}
  on:mouseup={() => (activeIdx = -1)}
  on:keydown={(e) => {
    if (e.key === "Delete" && selectedIdx !== -1) {
      if (selectedIdx === 0 || selectedIdx === automation.curves.length - 1)
        return;
      automation.curves.splice(selectedIdx, 1);
      automation.curves = [...automation.curves];
      selectedIdx = -1;
      rerender();
    }
  }}
/>

<section
  class="space-y-2 pb-2 border-b border-zinc-300 dark:border-zinc-800 border-dashed"
>
  <header class="flex justify-between items-center">
    <h4 class="text-zinc-600 dark:text-zinc-400">Edit {type} automation</h4>
    <IconButton alt="Close" on:click={() => (isAutomationVisible = false)}>
      <CloseIcon />
    </IconButton>
  </header>
  <main class="space-y-2">
    <div class="flex gap-2 h-fit">
      <ScalarSetting
        class="w-1/2"
        name="Duration"
        bind:scalar={automation.duration}
        props={{ min: 0, max: Infinity, step: 0.01 }}
        on:change={rerender}
        strictBounds
      />
      <ScalarSetting
        class="w-1/2"
        name="Offset"
        bind:scalar={automation.staticVal}
        defaultVal={0}
        props={{ min: 0, max: automation.duration, step: 0.01 }}
        strictBounds
      />
    </div>

    <div class="p-1 rounded-md bg-zinc-100 dark:bg-zinc-800/15">
      <div class="relative h-20 w-full">
        <!-- Visual spacers -->
        <div
          class="absolute flex justify-between w-full h-full pointer-events-none"
        >
          {#each { length: 5 } as _}
            <div
              class="h-full w-[1px] bg-gradient-to-t from-zinc-200 dark:from-zinc-900 to-transparent"
            />
          {/each}
        </div>
        <canvas bind:this={canvas} class="w-full h-full" />
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="absolute top-0 left-0 w-full h-full"
          bind:clientWidth={editContainerWidth}
          bind:clientHeight={editContainerHeight}
          on:click={(e) => {
            if (!e.ctrlKey) return;
            let x = normX(
              Math.min(
                Math.max(e.clientX - canvas.getBoundingClientRect().left, 0),
                editContainerWidth
              )
            );

            let y = normY(
              Math.min(
                Math.max(e.clientY - canvas.getBoundingClientRect().top, 0),
                editContainerHeight
              )
            );

            for (let i = 0; i < automation.curves.length; i++) {
              if (automation.curves[i][0] > x) {
                automation.curves.splice(i, 0, [x, y]);
                automation.curves = [...automation.curves];
                rerender();
                break;
              }
            }
          }}
          on:click|self={() => (activeIdx = -1)}
        >
          {#each automation.curves as curve, i (curve)}
            <!-- Convert x and y scalar values back to pixels -->
            {@const [x, y] = [
              // TODO: is this worky?
              (curve[0] / 1) * editContainerWidth,
              (1 - curve[1]) * editContainerHeight,
            ]}
            <button
              class="absolute w-3 h-3 flex justify-center items-center transform -translate-x-1/2 -translate-y-1/2"
              style="left:{x}px; top:{y}px"
              on:mousedown={(e) => {
                initialMousePos = [
                  e.clientX - canvas.getBoundingClientRect().left,
                  e.clientY - canvas.getBoundingClientRect().top,
                ];
                initialNodePos = [curve[0], curve[1]];
                activeIdx = i;
                selectedIdx = i;
              }}
            >
              <div
                class="rounded-full w-1 h-1 {selectedIdx === i
                  ? 'bg-blue-300 dark:bg-blue-600'
                  : 'bg-zinc-600 dark:bg-zinc-500'}"
              />
            </button>
          {/each}
        </div>
      </div>
    </div>

    <!-- Timings -->
    <div
      class="border-t border-zinc-200 dark:border-zinc-900 flex justify-between"
    >
      <p class="text-zinc-600 dark:text-zinc-500">0s</p>
      <p class="text-zinc-600 dark:text-zinc-500">
        {automation.duration.toFixed(2)}s
      </p>
    </div>
  </main>
</section>
