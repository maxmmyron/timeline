<script lang="ts">
  import Node from "./NodeEditor/Node.svelte";
  import { panelConnections, panelPos } from "$lib/stores";
  import { beforeUpdate, onMount, SvelteComponent } from "svelte";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  export let current: App.VideoClip | App.AudioClip | App.ImageClip;

  let moving: boolean = false;
  let initMouse: [number, number] = [0, 0];
  let initPos: [number, number] = [0, 0];

  let refs: Record<string, HTMLElement> = {};
  let inputs: Record<string, { [key: string]: any }> = {};
  let outputs: Record<string, { [key: string]: any }> = {};

  const startMove = (x: number, y: number) => {
    moving = true;
    initPos = [$panelPos[0], $panelPos[1]];
    initMouse = [x, y];
  };

  const move = (x: number, y: number) => {
    if (!moving) return;

    let newPos: [number, number] = [
      x - initMouse[0] + initPos[0],
      y - initMouse[1] + initPos[1],
    ];
    panelPos.set(newPos, { hard: true });
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

    return () => {
      panelPos.set([0, 0], { hard: true });
      $panelConnections = {};
    };
  });

  const connect = <
    T extends App.EditorNode<(...args: any) => any>,
    U extends keyof ReturnType<T["transform"]>,
    K extends App.EditorNode<(...args: any) => any>,
  >(
    nodeA: T,
    nodeOut: U,
    nodeB: K,
    nodeIn: keyof App.PickByType<
      Parameters<K["transform"]>[0],
      ReturnType<T["transform"]>[U]
    >
  ) => {
    nodeA.connections[nodeOut] = {
      uuid: nodeB.uuid,
      in: <string>nodeIn,
    };
  };
</script>

<svelte:window
  on:mouseup={() => (moving = false)}
  on:touchend={() => (moving = false)}
  on:touchmove={(e) => move(e.touches[0].clientX, e.touches[0].clientY)}
  on:mousemove={(e) => move(e.clientX, e.clientY)}
/>

<div
  on:dblclick={() => panelPos.set([0, 0])}
  on:mousedown={(e) => startMove(e.clientX, e.clientY)}
  on:touchstart={(e) => startMove(e.touches[0].clientX, e.touches[0].clientY)}
  role="grid"
  tabindex="0"
  class="relative bg-dot -top-1 -left-1 w-[calc(100%_+_.5rem)] h-[calc(100%_+_.5rem)] from-zinc-925 from-25% to-zinc-950 to-25%"
  style="background-position: {$panelPos[0] % 8}px {$panelPos[1] % 8}px"
>
  {#each current.nodes as node}
    {@const uuid = node.uuid}
    {#key node.uuid}
      <Node
        {node}
        bind:ref={refs[node.uuid]}
        bind:inputs={inputs[uuid]}
        bind:outputs={outputs[uuid]}
        on:transform={(e) => {
          console.log("updating inputs");
          for (const [outputName, input] of Object.entries(node.connections)) {
            if (!input) continue;
            inputs[input.uuid][input.in] = e.detail[outputName];
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
