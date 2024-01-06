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

  const moveClip = (e: MouseEvent) => {
    const offsetPos = e.clientX - moveOffset;
    const newOffset = Math.max(0, offsetPos / TIME_SCALING);

    // update offset of clip with new offset, snapping if possible
    if (e.shiftKey) clip.offset = newOffset;
    else clip.offset = snapOnMove(newOffset);

    // reassign to trigger reactivity
    $videoClips = [...$videoClips];
  };

  const resizeClip = (e: MouseEvent) => {
    const delta = e.clientX - initialResizeMousePos;

    // if holding shift, keep offset stationary (reposition w.r.t left of clip)
    let newOffset = initialTrimValues.offset;
    // if *not* holding shift, move offset with clip
    if (!e.shiftKey) {
      newOffset = Math.max(
        initialTrimValues.offset - initialTrimValues.start,
        initialTrimValues.offset + delta / TIME_SCALING
      );
    }

    if (resizeMode === "left") {
      let newStart = Math.min(
        Math.max(0, initialTrimValues.start + delta / TIME_SCALING),
        clip.media.duration - clip.end
      );
      clip.start = snapOnResize(newStart);
      clip.offset = newOffset;
    } else if (resizeMode === "right") {
      clip.end = Math.min(
        Math.max(0, initialTrimValues.end - delta / TIME_SCALING),
        clip.media.duration - clip.start
      );
    }

    // reassign to trigger reactivity
    $videoClips = [...$videoClips];
  };

  /**
   * Checks if the given offset is within a 0.1s threshold of any other clip's
   * end. If so, returns a new offset such that the clip is "snapped" to the end
   * of the nearest clip. Otherwise, returns the original offset.
   *
   * @param eagerOffset - The predicted offset of the clip during move. I.e. the
   * calculated offset before the clip is released from the mouse.
   */
  const snapOnMove = (eagerOffset: number) => {
    const clips = $videoClips
      .filter((c) => c.uuid !== clip.uuid)
      // calculate distance from end of clip to beginning of current clip
      .map((c) => {
        const end = c.offset + (c.media.duration - c.start - c.end);
        const distance = Math.abs(eagerOffset - end);
        return { clip: c, distance };
      })
      .filter((c) => c.distance < 0.05);

    if (!clips.length) return eagerOffset;

    // reaching here means there is at least one clip within 0.1s threshold, so
    // we reduce to find the nearest clip.
    let nearest = clips.reduce((prev, curr) => {
      if (prev.distance < curr.distance) return prev;
      return curr;
    }).clip;

    eagerOffset =
      nearest.offset + (nearest.media.duration - nearest.start - nearest.end);

    return eagerOffset;
  };

  /**
   * Snaps the beginning of the resized clip's start/end to the end of the nearest
   * clip on the left, if within a 0.1s threshold (and vice versa for the end).
   */
  const snapOnResize = (eagerSnap: number) => {
    /**
     * Edge cases:
     *  - within 0.1 threshold, however clip's start/end is under necessary offset
     *    to snap
     *
     * if resize:
     *   if left: snap clip start to nearest clip end if within 0.1s
     *   if right: snap clip end to nearest clip start if within 0.1s
     */

    if (resizeMode === "left") {
      const clips = $videoClips
        .filter((c) => c.uuid !== clip.uuid)
        .map((c) => {
          const end = c.offset + (c.media.duration - c.start - c.end);
          const distance = Math.abs(clip.offset + eagerSnap - end);
          return { clip: c, distance };
        })
        .filter((c) => c.distance < 0.05);

      if (!clips.length) return eagerSnap;

      console.log(
        clip.uuid,
        clips.map((c) => c.clip.uuid)
      );

      let nearest = clips.reduce((prev, curr) => {
        if (prev.distance < curr.distance) return prev;
        return curr;
      }).clip;

      eagerSnap = Math.max(
        0,
        nearest.offset + (nearest.media.duration - nearest.start - nearest.end)
      );

      return eagerSnap;
    } else {
      // const clips = $videoClips
      //   // filter out current clip
      //   .filter((c) => c.uuid !== clip.uuid)
      //   // calculate distance from end of clip to beginning of current clip
      //   .map((c) => {
      //     const start = c.offset;
      //     const distance = Math.abs(eagerOffset - end);
      //     return { clip: c, distance };
      //   })
      //   .filter((c) => c.distance < 0.1);
      return eagerSnap;
    }
  };
</script>

<svelte:window
  on:mousemove={(e) => {
    if (canMoveClip) moveClip(e);
    if (resizeMode) resizeClip(e);
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
