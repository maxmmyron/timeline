<script lang="ts">
  import { xlink_attr } from "svelte/internal";
  import { resolveMedia } from "./loader";
  import { onMount } from "svelte";

  // *************************************
  // FRAMES
  // *************************************

  let time = 0;
  let paused = true;
  /**
   * Distance of 1 second in pixels
   */
  const TIME_SCALING = 100;

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

  // *************************************
  // TIMELINE
  // *************************************

  let videoClips: Clip[][] = [[]];
  let audioClips: Clip[][] = [[]];

  $: currentClips = [
    ...videoClips.map(getCurrentClip),
    ...audioClips.map(getCurrentClip),
  ];

  // *************************************
  // MEDIA
  // *************************************

  let files: FileList | null = null;

  let resolved: Media[] = [];

  const resolveFiles = async () => {
    if (!files) return;
    for (const file of files) {
      // TODO: more robust type assertion
      const media = await resolveMedia(file);
      resolved = [...resolved, media];
    }

    files = null;
  };

  // *************************************
  // CLIP DEBUG
  // *************************************

  const createClip = (track: Clip[], resolved: Media): Clip => ({
    media: resolved,
    offset:
      track.reduce(
        (acc, curr) => curr.offset - acc + acc + curr.media.duration,
        0
      ) +
      Math.random() * 2 -
      1,
    start: 0,
    uuid: Math.random().toString(36).substring(7),
    z: z++,
  });

  let videoRow = 0;
  let audioRow = 0;
  let z = 0;

  $: getCurrentClip = (clips: Clip[]): Clip | null => {
    let valid: Clip[] = [];
    for (const clip of clips) {
      if (clip.offset < time && clip.offset + clip.media.duration > time)
        valid.push(clip);
      if (clip.offset > time) break;
    }
    return valid.sort((a, b) => b.z - a.z)[0] ?? null;
  };
</script>

<svelte:body style="margin: 0;" />

<section>
  <button on:click={() => (videoClips = [...videoClips, []])}>+ vrow</button>
  <button on:click={() => (audioClips = [...audioClips, []])}>+ arow</button>
</section>

<section>
  <label for="video-row">video row</label>
  <input
    type="range"
    min="0"
    max={videoClips.length - 1}
    bind:value={videoRow}
    name="video-row"
  />
  <output for="video-row">{videoRow}</output>

  <label for="audio-row">audio row</label>
  <input
    type="range"
    min="0"
    max={audioClips.length - 1}
    bind:value={audioRow}
    name="audio-row"
  />
  <output for="audio-row">{audioRow}</output>
</section>

<br />
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
</section>

<section>
  {time}
</section>

<br />
<section>
  <input
    type="file"
    accept="video/*,audio/*,image/*"
    bind:files
    on:change={resolveFiles}
  />
  <section>
    {#each resolved as file}
      <section>
        <h2>{file.type}</h2>
        <p>{file.duration}</p>
        <button
          on:click={() => {
            if (file.type === "audio") {
              audioClips[audioRow] = [
                ...audioClips[audioRow],
                createClip(audioClips[audioRow], file),
              ];
            } else {
              videoClips[videoRow] = [
                ...videoClips[videoRow],
                createClip(videoClips[videoRow], file),
              ];
            }
          }}>+</button
        >
      </section>
    {/each}
  </section>
</section>

<div class="timeline">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="tick-container"
    on:click={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      time = x / TIME_SCALING;
    }}
  >
    {#each { length: Math.ceil(time) } as _, i}
      <div class="tick" style="width: {TIME_SCALING}px; height: 100%">
        <p>{i}</p>
      </div>
    {/each}
  </div>
  {#each [videoClips, audioClips] as xClips, i}
    {#each xClips as clips, j}
      <div class="row">
        <p style="position:absolute">{i === 0 ? "v" : "a"}{j}</p>
        {#each clips as clip}
          <button
            class="clip"
            style="transform: translateX({clip.offset *
              TIME_SCALING}px); width: {clip.media.duration *
              TIME_SCALING}px; z-index:{clip.z};"
            on:click={() => (clip.z = Math.max(...clips.map((c) => c.z)) + 1)}
          >
            <p>{clip.uuid}, {clip.z}</p>
            <p>{clip.media.title}</p>
          </button>
        {/each}
      </div>
    {/each}
    <hr />
  {/each}
  <div
    class="scrubber"
    style="transform: translateX({time * TIME_SCALING}px; z-index: 9999999;"
  />
</div>

<section>
  {#each videoClips as clips, i}
    <p>v{i} current: {getCurrentClip(clips)?.uuid}</p>
  {/each}
  {#each audioClips as clips, i}
    <p>a{i} current: {getCurrentClip(clips)?.uuid}</p>
  {/each}
</section>

<section class="player">
  {#each currentClips as clip}
    {#if clip}
      {#if clip.media.type === "video"}
        <video src={clip.media.src} class="media" />
      {:else if clip.media.type === "audio"}
        <audio src={clip.media.src} />
      {:else if clip.media.type === "image"}
        <img src={clip.media.src} class="media" />
      {:else}
        <p>unknown</p>
      {/if}
    {:else}
      <p>none</p>
    {/if}
  {/each}
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
    border: 1px solid rgb(71, 178, 142);
    width: 100px;
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
