<script lang="ts">
  import { TIME_SCALING, videoClips } from "./stores";

  export let clip: Clip;

  let canMoveClip = false;
  let resizeMode: "left" | "right" | null = null;

  let clipEl: HTMLButtonElement;

  /**
   * Distance from left of clip to mouse
   */
  let movedOffset = 0;

  $: transform = `translateX(${clip.offset * TIME_SCALING}px)`;
  $: width = `${clip.media.duration * TIME_SCALING}px`;

  const moveClip = (clientX: number) => {
    const newPos = clientX - movedOffset;

    clip.offset = Math.max(0, newPos / TIME_SCALING);

    // reassign to trigger reactivity
    $videoClips = [...$videoClips];
  };

  const resizeClip = (clientX: number) => {};
</script>

<svelte:window
  on:mousemove={(e) => {
    if (canMoveClip) moveClip(e.clientX);
    if (resizeMode) resizeClip(e.clientX);
  }}
  on:mouseup={() => {
    canMoveClip = false;
    resizeMode = null;
  }}
/>

<button
  class="clip"
  style:transform
  style:width
  style:z-index={clip.z}
  bind:this={clipEl}
  on:mousedown|stopPropagation={(e) => {
    canMoveClip = true;
    movedOffset = e.clientX - clipEl.getBoundingClientRect().left;
  }}
  on:click
>
  <button class="trimmer left" on:click|stopPropagation={(e) => {}}></button>
  <p>{clip.uuid}, {clip.z}</p>
  <p>{clip.media.title}</p>
  <button class="trimmer right" on:click|stopPropagation={(e) => {}}></button>
</button>

<style>
  button {
    cursor: pointer;
    position: absolute;
    height: 100%;
    border: none;
    border-radius: 4px;
  }

  button.clip {
    /* border: 1px inset solid rgb(71, 178, 142); */
    background-color: aquamarine;
  }

  button.trimmer {
    top: 0;
    width: 0.5rem;
    background-color: rgb(71, 178, 142);
  }

  button.trimmer.left {
    left: 0;
  }

  button.trimmer.right {
    right: 0;
  }

  button > p {
    margin: 0;
  }
</style>
