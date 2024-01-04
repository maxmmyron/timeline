<script lang="ts">
  import ResolvedClip from "./ResolvedClip.svelte";
  import { resolveMedia } from "./loader";
  import { onMount, tick } from "svelte";

  let paused = true;
  let time = 0;

  let canMoveScrubber = false;
  let tickContainer: HTMLDivElement;

  let canMoveClip = false;
  /**
   * UUID of clip being moved
   */
  let movedUUID: string | null = null;
  /**
   * Distance from left of clip to mouse
   */
  let movedOffset = 0;

  $: console.log(canMoveClip, movedUUID, movedOffset);

  /**
   * Distance of 1 second in pixels
   */
  const TIME_SCALING = 100;

  // *************************************
  // SOURCES
  // *************************************

  let videoEl: HTMLVideoElement | null = null;
  let files: FileList | null = null;
  let resolved: Media[] = [];

  // *************************************
  // TIMELINE
  // *************************************

  let videoClips: Clip[] = [];
  // we get uuid as string instead of entire object so reassignment doesn't
  // trigger reactivity
  $: currentUUID = getCurrentClip(videoClips);
  $: current = videoClips.find((c) => c.uuid === currentUUID) ?? null;

  // *************************************
  // PLAYBACK MANAGEMENT
  // *************************************

  $: if (paused === true && videoEl) videoEl.pause();
  $: if (paused === false && videoEl) videoEl.play();

  // when currentVideo changes, update
  $: current, time, updatePlayer();
  // reset video time when video changes
  $: currentUUID, resetVideoTime();

  const updatePlayer = async () => {
    // wait for DOM update
    await tick();

    if (!videoEl || !current) return;

    // if we're paused, we need to update the time
    if (paused) {
      videoEl.currentTime = time - current.offset;
    }

    // if we're playing, we need to update the time
    if (!paused && videoEl.paused) {
      videoEl.play();
    }
  };

  /**
   * Runs when video changes to reset runtime to match clip offset
   */
  const resetVideoTime = async () => {
    // break if we don't have a video element or current clip
    if (!currentUUID) return;

    // wait for DOM update
    await tick();

    if (!videoEl || !current) return;

    // if we're playing, we need to update the time
    videoEl.currentTime = time - current.offset;
  };

  let lastTimestamp = 0;
  const frame = (timestamp: DOMHighResTimeStamp) => {
    if (paused) {
      lastTimestamp = timestamp;
      requestAnimationFrame(frame);
      return;
    }

    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    time += delta / 1000;

    requestAnimationFrame(frame);
  };

  onMount(() => requestAnimationFrame(frame));

  const resolveFiles = async () => {
    if (!files) return;
    for (const file of files) {
      // TODO: more robust type assertion
      const media = await resolveMedia(file);
      resolved = [...resolved, media];
    }

    files = null;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (canMoveScrubber) moveScrubber(e.clientX);
    if (canMoveClip) moveClip(e.clientX);
  };

  const moveScrubber = (clientX: number) => {
    const rect = tickContainer.getBoundingClientRect();
    const x = clientX - rect.left;
    time = x / TIME_SCALING;
  };

  const moveClip = (clientX: number) => {
    if (!movedUUID) return;

    const newPos = clientX - movedOffset;
    const clip = videoClips.find((c) => c.uuid === movedUUID);

    if (!clip) return;
    console.log("moving");
    clip.offset = Math.max(0, newPos / TIME_SCALING);

    // reassign to trigger reactivity
    videoClips = [...videoClips];
  };

  // *************************************
  // CLIP DEBUG
  // *************************************

  const createClip = (resolved: Media): Clip => ({
    media: resolved,
    offset: time,
    start: 0,
    // TODO: improve UUID gen.
    uuid: Math.random().toString(36).substring(7),
    z: z++,
  });

  let z = 0;

  $: getCurrentClip = (clips: Clip[]): string | null => {
    let valid: Clip[] = [];
    for (const clip of clips) {
      if (clip.offset < time && clip.offset + clip.media.duration > time)
        valid.push(clip);
      if (clip.offset > time) break;
    }
    return valid.sort((a, b) => b.z - a.z)[0]?.uuid ?? null;
  };
</script>

<svelte:window
  on:mousemove={handleMouseMove}
  on:mouseup={() => {
    canMoveScrubber = false;
    canMoveClip = false;
  }}
/>

<section>
  <button
    on:click={() => {
      time = 0;
      paused = true;
    }}>⏮️</button
  >
  <button on:click={() => (paused = !paused)}>
    {paused ? "play" : "pause"}
  </button>
  <button
    on:click={() => {
      paused = true;
      time = 0;
    }}>⏭️</button
  >

  {time}
</section>

<section>
  <input
    type="file"
    accept="video/*"
    multiple
    bind:files
    on:change={resolveFiles}
  />
  <section>
    {#each resolved as file}
      <ResolvedClip
        {file}
        on:click={() => (videoClips = [...videoClips, createClip(file)])}
      />
    {/each}
  </section>
</section>

<section>
  <button on:click={() => console.log(videoClips)}>log</button>
</section>

<div class="timeline">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="tick-container"
    bind:this={tickContainer}
    on:mousedown={(e) => {
      canMoveScrubber = true;
      moveScrubber(e.clientX);
    }}
  >
    {#each { length: Math.ceil(time) } as _, i}
      <div class="tick" style="width: {TIME_SCALING}px; height: 100%">
        <p>{i}</p>
      </div>
    {/each}
  </div>
  <div class="row">
    {#each videoClips as clip}
      <button
        class="clip"
        style="transform: translateX({clip.offset *
          TIME_SCALING}px); width: {clip.media.duration *
          TIME_SCALING}px; z-index:{clip.z};"
        on:click={() => (clip.z = Math.max(...videoClips.map((c) => c.z)) + 1)}
        on:mousedown={(e) => {
          canMoveClip = true;
          movedUUID = clip.uuid;
          movedOffset =
            e.clientX - e.currentTarget.getBoundingClientRect().left;
        }}
      >
        <p>{clip.uuid}, {clip.z}</p>
        <p>{clip.media.title}</p>
      </button>
    {/each}
  </div>
  <hr />
  <div
    class="scrubber"
    style="transform: translateX({time * TIME_SCALING}px; z-index: 9999999;"
  />
</div>

<section class="player">
  {#if current}
    <video
      src={current.media.src}
      class="media"
      bind:this={videoEl}
      title={current.uuid}
    >
      <track kind="captions" />
    </video>
  {/if}
</section>

<style>
  * {
    box-sizing: border-box;
  }

  section {
    border: 1px solid rgba(200 200 200 / 0.75);
    display: inline-flex;
    width: fit-content;
    padding: 8px;
    gap: 8px;
  }

  .timeline {
    position: relative;
    width: 100vw;
    overflow: scroll;
    margin-top: 32px;
  }

  .timeline > .tick-container {
    height: 1rem;
    display: flex;
    background-color: rgba(200 200 200 / 0.75);
  }

  .tick {
    border-right: 1px solid rgba(100 100 100 / 0.75);
    position: relative;
    pointer-events: none;
    user-select: none;
  }

  .tick > p {
    position: absolute;
    left: 2px;
    margin: 0;
  }

  .timeline > .row {
    position: relative;
    width: 100%;
    border: 1px solid rgba(200 200 200 / 0.75);
    border-left: 0;
    border-right: 0;
    height: 64px;
  }

  .scrubber {
    top: 0;
    position: absolute;
    width: 2px;
    height: 100%;
    background-color: red;
  }

  .clip {
    cursor: pointer;
    position: absolute;
    /* border: 1px solid rgb(71, 178, 142); */
    border: none;
    height: 100%;
    border-radius: 12px;
    background-color: aquamarine;
  }

  .clip > p {
    margin: 0;
  }

  .player > .media {
    width: 200px;
  }
</style>
