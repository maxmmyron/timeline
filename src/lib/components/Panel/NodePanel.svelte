<script lang="ts">
  import { spring } from "svelte/motion";
  import Node from "./NodeEditor/Node.svelte";
  import { onMount } from "svelte";

  export let current: App.VideoClip | App.AudioClip | App.ImageClip;

  let offset = spring([0, 0], { stiffness: 0.1, damping: 0.3 });

  let moving: boolean = false;
  let initMouse: [number, number] = [0, 0];
  let initPos: [number, number] = [0, 0];

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

  let inputs: Record<string, { [key: string]: any }>;
  let outputs: Record<string, { [key: string]: any }>;
</script>

<svelte:window
  on:mouseup={() => (moving = false)}
  on:touchend={() => (moving = false)}
  on:touchmove={(e) => move(e.touches[0].clientX, e.touches[0].clientY)}
  on:mousemove={(e) => move(e.clientX, e.clientY)}
/>

<div
  on:dblclick={() => offset.set([0, 0])}
  on:mousedown={(e) => startMove(e.clientX, e.clientY)}
  on:touchstart={(e) => startMove(e.touches[0].clientX, e.touches[0].clientY)}
  role="grid"
  tabindex="0"
  class="relative bg-dot -top-1 -left-1 w-[calc(100%_+_.5rem)] h-[calc(100%_+_.5rem)] from-zinc-925 from-25% to-zinc-950 to-25%"
  style="background-position: {$offset[0] % 8}px {$offset[1] % 8}px"
>
  {#each current.nodes as { uuid, name, connections, transform }}
    <Node
      on:transform={(output) => {
        for (const [outputName, input] of Object.entries(connections)) {
          inputs[input.uuid][input.inputName] = output[outputName];
        }
      }}
      {transform}
      title={name}
      {uuid}
      bind:inputs={inputs[uuid]}
      bind:outputs={outputs[uuid]}
    />
  {/each}
</div>

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
