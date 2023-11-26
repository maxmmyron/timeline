<script>
  import { onMount } from "svelte";

  // *************************************
  // TYPEDEFS
  // *************************************

  /**
   * @typedef { Object } Clip
   * @property { number } duration duration of clip
   * @property { number } offset offset from start of video
   * @property { number } start start time relative clip 00:00 time
   * @property { string } uuid unique identifier
   * @property { number } z z offset relative to other clips
   */

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
  /**
   *
   * @param timestamp {DOMHighResTimeStamp}
   */
  const frame = (timestamp) => {
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

  /**
   * @type { Clip[][] }
   */
  let videoClips = [[]];

  /**
   * @type { Clip[][] }
   */
  let audioClips = [[]];

  /**
   * @type { HTMLDivElement }
   */
  let scrubber;

  $: if (scrubber)
    scrubber.style.transform = `translateX(${time * TIME_SCALING}px)`;

  // *************************************
  // CLIP DEBUG
  // *************************************

  /**
   * @param track { Clip[] }
   */
  const createClip = (track) => ({
    duration: Math.random() * 4 + 1,
    offset:
      track.reduce((acc, curr) => curr.offset - acc + acc + curr.duration, 0) +
      Math.random() * 2 -
      1,
    start: 0,
    uuid: Math.random().toString(36).substring(7),
    z: z++,
  });

  let videoRow = 0;
  let audioRow = 0;
  let z = 0;

  $: getCurrentClip = (clips) => {
    /**
     * @type { Clip[] }
     */
    let valid = [];
    for (const clip of clips) {
      if (clip.offset < time && clip.offset + clip.duration > time)
        valid.push(clip);
      if (clip.offset > time) break;
    }
    return valid.sort((a, b) => b.z - a.z)[0];
  };
</script>

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

  <button
    on:click={() =>
      (videoClips[videoRow] = [
        ...videoClips[videoRow],
        createClip(videoClips[videoRow]),
      ])}>+ vclip</button
  >
  <button
    on:click={() =>
      (audioClips[audioRow] = [
        ...audioClips[audioRow],
        createClip(audioClips[audioRow]),
      ])}>+ aclip</button
  >
  <button
    on:click={() => {
      for (let i = 0; i < videoClips.length; i++) {
        for (let j = 0; j < 10; j++)
          videoClips[i] = [...videoClips[i], createClip(videoClips[i])];
      }
      for (let i = 0; i < audioClips.length; i++) {
        for (let j = 0; j < 10; j++)
          audioClips[i] = [...audioClips[i], createClip(audioClips[i])];
      }
    }}>+ all</button
  >
</section>

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
  {#each videoClips as clips, i}
    <p>v{i} current: {getCurrentClip(clips)?.uuid}</p>
  {/each}
  {#each audioClips as clips, i}
    <p>a{i} current: {getCurrentClip(clips)?.uuid}</p>
  {/each}
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
  ></div>
  {#each [videoClips, audioClips] as xClips, i}
    {#each xClips as clips, j}
      <div class="row">
        <p style="position:absolute">{i === 0 ? "v" : "a"}{j}</p>
        {#each clips as clip}
          <button
            class="clip"
            style="transform: translateX({clip.offset *
              TIME_SCALING}px); width: {clip.duration *
              TIME_SCALING}px; z-index:{clip.z};"
            on:click={() => (clip.z = Math.max(...clips.map((c) => c.z)) + 1)}
          >
            <p>{clip.uuid}, {clip.z}</p>
          </button>
        {/each}
      </div>
    {/each}
    <hr />
  {/each}
  <div bind:this={scrubber} class="scrubber" style="z-index: 9999999;" />
</div>

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
    background-color: rgba(200 200 200 / 0.75);
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
</style>
