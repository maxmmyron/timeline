<script lang="ts">
  import { onMount } from "svelte";
  import IconButton from "../IconButton.svelte";
  import ScalarSetting from "./ScalarSetting.svelte";

  export let isAutomationVisible: boolean;
  export let automation: App.Automation;
  export let dynamicBounds: boolean = false;

  let [min, max] = automation.valueBounds || [
    automation.staticVal - 1,
    automation.staticVal + 1,
  ];

  // if dynamic bounds are enabled, we need to update the value bounds whenever
  // the user changes the bounds properties
  $: if (dynamicBounds) automation.valueBounds = [min, max];

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;

  let [editW, editH] = [0, 0];

  let selectedIdx = -1;
  let activeIdx = -1;

  let initialMousePos: [number, number] = [0, 0];
  let initialNodePos: [number, number] = [0, 0];

  let scalarTime = 0;

  /**
   * We need to manually track and update scalarTime to prevent reactivity
   * circularity from messing with the bound scalar value when the X value is
   * changed.
   */
  const setScalarTime = () =>
    (scalarTime =
      automation.curves[selectedIdx][0] * automation.duration +
      automation.offset);

  onMount(() => {
    if (automation.curves.length == 0) {
      automation.curves = [
        [0, automation.staticVal],
        [1, automation.staticVal],
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

    for (let i = 0; i < automation.curves.length; i++) {
      const [x1, y1] = automation.curves[i];
      // if we're at the last point, use the previous point's Y value
      // (i.e. self)
      const [x2, y2] = automation.curves[i + 1] || [automation.duration, y1];

      ctx.beginPath();
      ctx.moveTo(x1 * canvas.width, unnormY(y1, canvas.height));
      ctx.lineTo(x2 * canvas.width, unnormY(y2, canvas.height));
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

    let y = Math.max(
      0,
      Math.min(e.clientY - canvas.getBoundingClientRect().top, editH)
    );
    let normedY = normY(Math.min(Math.max(y, 0), editH));

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

    let normedX = Math.min(Math.max(x, 0), editW) / editW;

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
    setScalarTime();
  };

  const normY = (px: number) => (1 - px / editH) * (max - min) + min;
  const unnormY = (y: number, h: number) => (1 - (y - min) / (max - min)) * h;
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
    <h4 class="text-zinc-600 dark:text-zinc-400">
      Edit {automation.type} automation
    </h4>
    <IconButton
      name="Close"
      showOutline
      alt="Close"
      on:click={() => (isAutomationVisible = false)}
    />
  </header>
  <main class="grid grid-cols-[2rem,1fr,1fr] gap-1">
    <!-- Duration & Automation -->
    <div class="row-start-1 col-span-full flex gap-2 h-fit">
      <ScalarSetting
        class="w-1/2"
        name="Duration"
        bind:scalar={automation.duration}
        props={{ min: 0, max: Infinity, step: 0.01 }}
        strictBounds
      />
      <ScalarSetting
        class="w-1/2"
        name="Offset"
        bind:scalar={automation.offset}
        defaultVal={0}
        props={{ min: 0, max: automation.duration, step: 0.01 }}
        strictBounds
      />
    </div>

    <!-- Graph Editor -->
    <div
      class="row-start-2 col-start-2 col-span-2 p-1 rounded-md bg-zinc-100 dark:bg-zinc-800/15"
    >
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
        <!-- Lines -->
        <canvas bind:this={canvas} class="w-full h-full" />
        <!-- Nodes -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="absolute top-0 left-0 w-full h-full"
          bind:clientWidth={editW}
          bind:clientHeight={editH}
          on:click={(e) => {
            if (!e.ctrlKey) return;
            let x =
              Math.min(
                Math.max(e.clientX - canvas.getBoundingClientRect().left, 0),
                editW
              ) / editW;

            let y = normY(
              Math.min(
                Math.max(e.clientY - canvas.getBoundingClientRect().top, 0),
                editH
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
              curve[0] * editW,
              (1 - (curve[1] - min) / (max - min)) * editH,
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
                setScalarTime();
              }}
              on:click={(e) => {
                if (e.ctrlKey) return;
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

    <!-- Bounds Editor -->
    <div class="col-start-1 row-start-2 flex flex-col justify-between">
      <ScalarSetting
        name=""
        disabled={!dynamicBounds}
        bind:scalar={max}
        props={{ min, max: Infinity, step: 0.01 }}
        on:change={() => {
          rerender();
        }}
        strictBounds
      />
      <ScalarSetting
        name=""
        disabled={!dynamicBounds}
        bind:scalar={min}
        props={{ min: -Infinity, max, step: 0.01 }}
        on:change={() => {
          rerender();
        }}
        strictBounds
      />
    </div>

    <!-- Timings -->
    <div class="col-start-2 col-span-2 row-start-3 flex justify-between">
      <p>
        {(0 + automation.offset).toFixed(2)}s
      </p>
      <p>
        {(automation.duration + automation.offset).toFixed(2)}s
      </p>
    </div>

    {#if selectedIdx !== -1}
      {@const minX =
        selectedIdx === 0
          ? automation.offset
          : automation.curves[selectedIdx - 1][0] * automation.duration +
            automation.offset}
      {@const maxX =
        selectedIdx === automation.curves.length - 1
          ? automation.duration + automation.offset
          : automation.curves[selectedIdx + 1][0] * automation.duration +
            automation.offset}
      <div class="flex justify-between col-start-2 col-span-2 row-start-4">
        <ScalarSetting
          disabled={selectedIdx === 0 ||
            selectedIdx === automation.curves.length - 1}
          class="w-1/2"
          name="X"
          bind:scalar={scalarTime}
          props={{ min: minX, max: maxX, step: 0.01 }}
          on:change={() => {
            automation.curves[selectedIdx][0] =
              (scalarTime - automation.offset) / automation.duration;

            rerender();
          }}
          strictBounds
        />
        <ScalarSetting
          class="w-1/2"
          name="Y"
          bind:scalar={automation.curves[selectedIdx][1]}
          props={{ min, max, step: 0.01 }}
          on:change={() => rerender()}
          strictBounds
        />
      </div>
    {/if}
  </main>
</section>
