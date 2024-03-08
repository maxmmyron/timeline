<script lang="ts">
  import Region from "../Region.svelte";
  import Clip from "./Clip.svelte";
  import Runtime from "../Runtime.svelte";

  import {
    scaleFactor,
    scroll,
    secondsPerTick,
    tickWidth,
    time,
    videoClips,
    audioClips,
    pointerMode,
  } from "$lib/stores";
  import { createEventDispatcher } from "svelte";

  let timeline: HTMLDivElement;
  let tickContainer: HTMLElement;

  let timelineOffset = 225;
  $: timeline && (timelineOffset = timeline.getBoundingClientRect().left);

  let tickContainerWidth = 0;

  let canMoveScrubber = false;

  /**
   * The timings to display on the timeline. Each timing is an array of two
   * numbers: the first is the time in seconds, and the second is the offset of
   * the tick leftwards.
   */
  $: tickTimings = Array.from(
    // only render the number of ticks that can fit in the tick container
    { length: Math.ceil(tickContainerWidth / $tickWidth) + 1 },
    (_, i) => {
      // timing offset is based on scroll left.
      // each tickwidth scroll amount is secondsPerTicks
      const timingOffset = Math.floor($scroll / $tickWidth);
      // the remainder of the scroll amount is the offset of the tick from the
      // left side of the screen
      const tickOffset = $scroll % $tickWidth;
      return [(i + timingOffset) * $secondsPerTick, tickOffset];
    }
  ) as Array<[number, number]>;

  /**
   * An event dispatcher that emits events related to when the scrubber moves
   */
  const dispatcher = createEventDispatcher<{
    scrubberMove: { time: number; x: number };
  }>();

  const moveScrubber = (clientX: number) => {
    const rect = tickContainer.getBoundingClientRect();
    const x = Math.max(0, clientX - rect.left) + $scroll;
    $time = x / $scaleFactor;

    // dispatch a "scrubberMove" event whenever the scrubber moves
    dispatcher("scrubberMove", {
      time: $time,
      x,
    });
  };

  $: console.log(timelineOffset);
</script>

<svelte:window
  on:mousemove={(e) => {
    if (canMoveScrubber) moveScrubber(e.clientX);
  }}
  on:mouseup={() => (canMoveScrubber = false)}
/>

<Region
  class="region relative !p-0 overflow-hidden h-full flex dark:bg-zinc-950 rounded-tl-none rounded-tr-none"
>
  <!-- TIMELINE TRACKS -->
  <aside class="h-full bg-white dark:bg-zinc-950 w-40 flex-shrink-0 z-20">
    <div
      class="bg-zinc-200 dark:bg-zinc-900 border-b border-r border-zinc-100 dark:border-zinc-950 w-full h-9"
    ></div>
    <!-- TODO: replace with bespoke video/audio tracks -->
    <div
      class="bg-zinc-200 dark:bg-zinc-900 border-b border-r border-zinc-100 dark:border-zinc-950 w-full h-10 px-3 flex items-center justify-end"
    >
      <p>Video Track 1</p>
    </div>
    <div
      class="bg-zinc-200 dark:bg-zinc-900 border-b border-r border-zinc-100 dark:border-zinc-950 w-full h-10 px-3 flex items-center justify-end"
    >
      <p>Audio Track 1</p>
    </div>
  </aside>

  <div
    class="relative w-full z-10 grid grid-cols-1 grid-rows-[2.25rem,repeat(auto-fill,2.5rem)]"
    bind:this={timeline}
    on:wheel={(e) => {
      $scroll = Math.max(0, $scroll + e.deltaY * $secondsPerTick);
    }}
  >
    <div class="row-span-full col-start-1 flex flex-col relative">
      <div
        class="h-9 flex"
        on:mousedown={(e) => {
          canMoveScrubber = true;
          moveScrubber(e.clientX);
        }}
        bind:this={tickContainer}
        bind:clientWidth={tickContainerWidth}
      >
        {#each tickTimings as [time, offset]}
          <div
            class="h-full shrink-0 select-none relative"
            style:width="{$tickWidth}px"
            style:left="-{offset}px"
          >
            <div class="flex h-5">
              <div
                class="relative w-full border-l border-zinc-300 dark:border-zinc-900 h-screen"
              />
              <div
                class="relative w-full border-l border-zinc-300 dark:border-zinc-900 h-2.5 top-2.5"
              />
              <div
                class="relative w-full border-l border-zinc-300 dark:border-zinc-900 h-2.5 top-2.5"
              />
              <div
                class="relative w-full border-l border-zinc-300 dark:border-zinc-900 h-4 top-1"
              />
              <div
                class="relative w-full border-l border-zinc-300 dark:border-zinc-900 h-2.5 top-2.5"
              />
              <div
                class="relative w-full border-l border-zinc-300 dark:border-zinc-900 h-2.5 top-2.5"
              />
            </div>
            <div class="w-full pl-1 text-zinc-500 dark:text-zinc-600">
              <Runtime {time} />
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="row-start-2 col-start-1 relative flex items-center w-full h-10">
      {#each $videoClips as clip}
        <Clip {clip} on:clipMove bind:timelineOffset />
      {/each}
    </div>
    <div class="row-start-3 col-start-1 relative flex items-center w-full h-10">
      {#each $audioClips as clip}
        <Clip {clip} on:clipMove bind:timelineOffset />
      {/each}
    </div>

    <div
      class="absolute top-0 w-0.5 bg-zinc-950/40 h-full rounded-full dark:bg-zinc-600/40 z-[999999999]"
      style:transform="translateX({$time * $scaleFactor - $scroll}px"
    />
  </div>
</Region>
