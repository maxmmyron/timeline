<script lang="ts">
  import { selected } from "$lib/stores";
  import { spring } from "svelte/motion";
  import Node from "./NodeEditor/Node.svelte";
  import { getClipByUUID } from "$lib/utils";

  let offset = spring([0, 0], { stiffness: 0.1, damping: 0.3 });

  let moving: boolean = false;
  let initMouse: [number, number] = [0, 0];
  let initPos: [number, number] = [0, 0];

  // non-null assertion since NodePanel doesn't render w/o $selected null check
  let current = getClipByUUID($selected![0], $selected![1]);

  const startMove = (x: number, y: number) => {
    moving = true;
    initPos = [$offset[0], $offset[1]];
    initMouse = [x, y];
  };

  const move = (x: number, y: number) => {
    if (!moving) return;

    let newPos = [x - initMouse[0] + initPos[0], y - initMouse[1] + initPos[1]];
    offset.set(newPos, { hard: true });
  };

  const transform = (arg: { in_a: number; in_b: number }) => {
    return {
      out: arg.in_a + arg.in_b,
    };
  };

  let i: Parameters<typeof transform>[0] = {
    in_a: 0,
    in_b: 0,
  };
  let o: ReturnType<typeof transform> = {
    out: 0,
  };
</script>

<svelte:window
  on:mouseup={() => (moving = false)}
  on:touchend={() => (moving = false)}
  on:touchmove={(e) => move(e.touches[0].clientX, e.touches[0].clientY)}
  on:mousemove={(e) => move(e.clientX, e.clientY)}
/>

{#if $selected}
  <div
    on:dblclick={() => offset.set([0, 0])}
    on:mousedown={(e) => startMove(e.clientX, e.clientY)}
    on:touchstart={(e) => startMove(e.touches[0].clientX, e.touches[0].clientY)}
    role="grid"
    tabindex="0"
    class="relative bg-dot -top-1 -left-1 w-[calc(100%_+_.5rem)] h-[calc(100%_+_.5rem)] from-zinc-925 from-25% to-zinc-950 to-25%"
    style="background-position: {$offset[0] % 8}px {$offset[1] % 8}px"
  ></div>
{:else}
  <div class="w-full h-full flex items-center justify-center">
    <p>No clip selected</p>
    <input type="range" min="0" max="10" bind:value={i.in_a} />
    <input type="range" min="0" max="10" bind:value={i.in_b} />
    {#each current.nodes as {uuid, name, connections, transform}}
      <Node {transform} {connections} title={name} {uuid} />
    {/each}
    <!-- <Node {transform} bind:inputs={i} bind:outputs={o} title="x" /> -->
    {o.out}
  </div>
{/if}

<style>
  .bg-dot {
    background-image: radial-gradient(
      circle at 4px 4px,
      var(--tw-gradient-from),
      var(--tw-gradient-to)
    );
    background-size: 8px 8px;
  }
</style>
