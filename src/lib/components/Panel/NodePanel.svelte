<script lang="ts">
  import { spring } from "svelte/motion";
  import Node from "./NodeEditor/Node.svelte";
  import { beforeUpdate, onMount, SvelteComponent } from "svelte";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  export let current: App.VideoClip | App.AudioClip | App.ImageClip;

  let offset = spring<[number, number]>([0, 0], {
    stiffness: 0.1,
    damping: 0.3,
  });

  let moving: boolean = false;
  let initMouse: [number, number] = [0, 0];
  let initPos: [number, number] = [0, 0];

  let connections = {};

  let inputs: Record<string, { [key: string]: any }> = {};
  let outputs: Record<string, { [key: string]: any }> = {};

  const startMove = (x: number, y: number) => {
    moving = true;
    initPos = [$offset[0], $offset[1]];
    initMouse = [x, y];
  };

  const move = (x: number, y: number) => {
    if (!moving) return;

    let newPos: [number, number] = [
      x - initMouse[0] + initPos[0],
      y - initMouse[1] + initPos[1],
    ];
    offset.set(newPos, { hard: true });
  };

  // before we update the component, we need to go through each node and ensure its inputs and outputs are recorded in the relevant records!
  beforeUpdate(() => {
    for (const node of current.nodes) {
      if (!inputs[node.uuid]) inputs[node.uuid] = node.in;
      if (!outputs[node.uuid]) outputs[node.uuid] = node.out;
    }
  });

  onMount(() => {
    ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    for (const node of current.nodes) {
      for (const [key, connection] of Object.entries(node.connections)) {
        const n = Math.floor(Math.random() * 10);
        nodeRefs[node.uuid].querySelector(`#output-${key}`)!.innerHTML =
          n.toString();
        nodeRefs[connection.uuid].querySelector(
          `#input-${connection.inputName}`
        )!.innerHTML = n.toString();
      }
    }
  });
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
  {#each current.nodes as node}
    {@const uuid = node.uuid}
    {#key node.uuid}
      <Node
        {node}
        bind:ref={nodeRefs[uuid]}
        bind:inputs={inputs[uuid]}
        bind:outputs={outputs[uuid]}
        bind:panelOffset={$offset}
        on:transform={(e) => {
          console.log("updating inputs");
          for (const [outputName, input] of Object.entries(node.connections)) {
            inputs[uuid][input.inputName] = e.detail[outputName];
          }
        }}
      />
    {/key}
  {/each}
</div>

<canvas bind:this={canvas} class="pointer-events-none w-full h-full"></canvas>

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
