<script lang="ts">
  import Region from "../Region.svelte";
  import TimelineClip from "../TimelineClip.svelte";
  import Runtime from "../Runtime.svelte";

  import {
    scaleFactor,
    scroll,
    secondsPerTick,
    tickWidth,
    time,
    videoClips,
  } from "$lib/stores";
  import { createEventDispatcher } from "svelte";

  let timeline: HTMLElement;
  let tickContainer: HTMLElement;

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
  const scrubberMoveDispatcher = createEventDispatcher();

  const moveScrubber = (clientX: number) => {
    const rect = tickContainer.getBoundingClientRect();
    const x = Math.max(0, clientX - rect.left) + $scroll;
    $time = x / $scaleFactor;

    // dispatch a "scrubberMove" event whenever the scrubber moves
    scrubberMoveDispatcher("scrubberMove", {
      time: $time,
      x,
    });
  };
</script>

<svelte:window
  on:mousemove={(e) => {
    if (canMoveScrubber) moveScrubber(e.clientX);
  }}
  on:mouseup={() => (canMoveScrubber = false)}
/>

<Region
  class="region relative flex flex-col !p-0 overflow-hidden lg:row-start-4 lg:col-start-1 lg:col-span-full"
  bind:el={timeline}
  on:wheel={(e) => {
    $scroll = Math.max(0, $scroll + e.deltaY * $secondsPerTick);
  }}
>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="h-4 flex"
    bind:clientWidth={tickContainerWidth}
    bind:this={tickContainer}
    on:mousedown={(e) => {
      canMoveScrubber = true;
      moveScrubber(e.clientX);
    }}
  >
    {#each tickTimings as [time, offset]}
      <div
        class="h-full shrink-0 bg-slate-300 border-r border-slate-950/40 pl-0.5 relative overflow-hidden select-none"
        style:width="{$tickWidth}px"
        style:left="-{offset}px"
      >
        <Runtime {time} />
      </div>
    {/each}
  </div>
  <div class="relative flex items-center w-full h-full">
    {#each $videoClips as clip}
      <TimelineClip {clip} />
    {/each}
  </div>
  <div
    class="absolute top-0 w-1 bg-slate-950/40 h-full rounded-full"
    style="transform: translateX({$time * $scaleFactor -
      $scroll}px; z-index: 9999999;"
  />
</Region>
