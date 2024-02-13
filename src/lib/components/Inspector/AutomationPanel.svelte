<script lang="ts">
  import { onMount } from "svelte";
  import CloseIcon from "$lib/icon/CloseIcon.svelte";
  import IconButton from "../IconButton.svelte";

  export let isAutomationVisible: boolean;
  export let automation: App.Automation;

  $: type = automation.type;
  $: uuid = automation.uuid;

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;

  let editContainerWidth = 0;
  let editContainerHeight = 0;

  /**
   * The curve and point index that is being moved.
   * if [0] === -1 || [1] === -1, no point is being moved.
   */
  let moveIndex = [-1, -1];

  onMount(() => {
    if (automation.curves.length == 0) {
      automation.curves = [
        [
          [0, automation.staticVal],
          [automation.duration, automation.staticVal],
          "linear",
        ],
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
      const curve = automation.curves[i];

      const [x1, y1] = curve[0];
      const [x2, y2] = curve[1];

      const [startX, startY] = [
        (x1 / automation.duration) * canvas.width,
        (1 - y1) * canvas.height,
      ];

      const [endX, endY] = [
        (x2 / automation.duration) * canvas.width,
        (1 - y2) * canvas.height,
      ];

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = "hsl(200, 50%, 25%)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  /**
   * Moves the point specified by the move index struct, based on the following
   * rules:
   * 1. if [0] === 0 && [1] === 0, OR if [0] === (len - 1) && [1] === 1, then
   *    we're moving the first/last point respectively; special case applies:
   *    - X value is static.
   *    - does not change any other point in the curve.
   *
   * 2. otherwise, we're moving a point along the curve:
   *    - X and Y are both dynamic
   *    - if moving [0] point of a curve, also move the [1] point of the
   *      previous curve.
   *    - if moving [1] point of a curve, also move the [0] point of the next
   *      curve.
   */
  const move = (e: MouseEvent) => {
    if (moveIndex[0] === -1 || moveIndex[1] === -1) return;

    let x = e.clientX - canvas.getBoundingClientRect().left;
    let y = e.clientY - canvas.getBoundingClientRect().top;
    let newX = Math.min(Math.max(x, 0), editContainerWidth);
    let newY = Math.min(Math.max(y, 0), editContainerHeight);

    let adjustedX = (newX / editContainerWidth) * automation.duration;
    let adjustedY = 1 - newY / editContainerHeight;

    // special case: first/last point
    if (moveIndex[0] === 0 && moveIndex[1] === 0) {
      automation.curves[moveIndex[0]][0][1] = adjustedY;
      return;
    }
    if (moveIndex[0] === automation.curves.length - 1 && moveIndex[1] === 1) {
      automation.curves[moveIndex[0]][1][1] = adjustedY;
      return;
    }

    // moving a point along the curve. we can make a few assumptions:
    // 1. assume the moveIndex[1] value is 0 (as the only point with
    //    moveIndex[1] === 1 is the last point of a curve, which is handled
    //    above).
    // 2. assume the previous curve exists, as the first curve is handled
    //    above.
    automation.curves[moveIndex[0]][0] = [adjustedX, adjustedY];
    automation.curves[moveIndex[0] - 1][1] = [adjustedX, adjustedY];
  };
</script>

<svelte:window
  on:mousemove={(e) => {
    move(e);
    rerender();
  }}
  on:mouseup={() => (moveIndex = [-1, -1])}
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
  <main class="p-1 rounded-md bg-zinc-100 dark:bg-zinc-800/15">
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
      <div
        class="absolute top-0 left-0 w-full h-full"
        bind:clientWidth={editContainerWidth}
        bind:clientHeight={editContainerHeight}
      >
        {#each automation.curves as curve, i (curve)}
          {@const [x, y] = [
            (curve[0][0] / automation.duration) * editContainerWidth,
            (1 - curve[0][1]) * editContainerHeight,
          ]}
          <button
            class="absolute w-3 h-3 flex justify-center items-center transform -translate-x-1/2 -translate-y-1/2"
            style="left:{x}px; top:{y}px"
            on:mousedown={(e) => {
              moveIndex = [i, 0];
            }}
          >
            <div class="bg-zinc-600 dark:bg-zinc-500 rounded-full w-1 h-1" />
            {i}
          </button>
          {#if i === automation.curves.length - 1}
            {@const [x, y] = [
              (curve[1][0] / automation.duration) * editContainerWidth,
              (1 - curve[1][1]) * editContainerHeight,
            ]}
            <button
              class="absolute w-3 h-3 flex justify-center items-center transform -translate-x-1/2 -translate-y-1/2"
              style="left:{x}px; top:{y}px"
              on:mousedown={(e) => {
                moveIndex = [i, 1];
              }}
            >
              <div class="bg-zinc-600 dark:bg-zinc-500 rounded-full w-1 h-1" />
              {i + 1}
            </button>
          {/if}
        {/each}
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
