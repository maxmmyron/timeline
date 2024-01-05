<script lang="ts">
  import { TIME_SCALING, videoClips } from "./stores";

  export let clip: Clip;

  let canMoveClip = false;
  let resizeMode: "left" | "right" | null = null;

  let clipEl: HTMLButtonElement;

  /**
   * Distance from left of clip to mouse. Used to calculate new offset and to
   * maintain position of mouse on clip.
   */
  let moveOffset = 0;
  let initialResizeMousePos = 0;

  /**
   * Initial values of clip when resizing, so resize calculates don't resize
   * based on recently updated start/end/offset values
   */
  let initialTrimValues = { start: 0, end: 0, offset: 0 };

  $: clipLength = clip.media.duration - clip.start - clip.end;

  $: transform = `translateX(${clip.offset * TIME_SCALING}px)`;
  $: width = `${clipLength * TIME_SCALING}px`;

  const moveClip = (clientX: number) => {
    const newPos = clientX - moveOffset;

    clip.offset = Math.max(0, newPos / TIME_SCALING);

    // reassign to trigger reactivity
    $videoClips = [...$videoClips];
  };

  const resizeClip = (clientX: number) => {
    const delta = clientX - initialResizeMousePos;

    if (resizeMode === "left") {
      clip.start = Math.max(0, initialTrimValues.start + delta / TIME_SCALING);
      clip.offset = Math.max(
        0,
        initialTrimValues.offset + delta / TIME_SCALING
      );
    } else if (resizeMode === "right") {
      clip.end = Math.max(0, initialTrimValues.end - delta / TIME_SCALING);
    }

    // reassign to trigger reactivity
    $videoClips = [...$videoClips];
  };
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
    moveOffset = e.clientX - clipEl.getBoundingClientRect().left;
  }}
  on:click
>
  <button
    class="trimmer left"
    on:mousedown|capture|stopPropagation={(e) => {
      resizeMode = "left";
      initialResizeMousePos = e.clientX;
      initialTrimValues.start = clip.start;
      initialTrimValues.offset = clip.offset;
    }}
  ></button>
  <p>{clip.uuid}, {clip.z}</p>
  <p>{clip.media.title}</p>
  <button
    class="trimmer right"
    on:mousedown|capture|stopPropagation={(e) => {
      resizeMode = "right";
      initialResizeMousePos = e.clientX;
      initialTrimValues.end = clip.end;
      initialTrimValues.offset = clip.offset;
    }}
  ></button>
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
