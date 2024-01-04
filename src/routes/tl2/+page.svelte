<script lang="ts">
  import { resolveMedia } from "./loader";
  import { onMount, tick } from "svelte";

  let audioContext: AudioContext | null = null;

  let paused = true;
  let time = 0;

  /**
   * Last time we paused at. Used to calculate delta if scrubber moves during
   * pause.
   */
  let lastTime = 0;

  /**
   * Distance of 1 second in pixels
   */
  const TIME_SCALING = 100;

  // *************************************
  // SOURCES
  // *************************************

  let videoEl: HTMLVideoElement | null = null;
  let imgEl: HTMLImageElement | null = null;

  let activeSources = new Map<string, AudioBufferSourceNode>();

  let files: FileList | null = null;
  let resolved: Media[] = [];

  // *************************************
  // TIMELINE
  // *************************************

  let videoClips: Clip[] = [];
  let audioClips: Clip[][] = [[]];

  $: console.log(videoClips);

  $: currentVideo = getCurrentClip(videoClips);
  $: currentAudio = <Clip[]>audioClips.map(getCurrentClip).filter(Object);

  // *************************************
  // PLAYBACK MANAGEMENT
  // *************************************

  $: if (paused === true) pause();
  $: if (paused === false) play();
  // when time changes, update sources
  $: time, updateSourcesAtPause();
  // when currentVideo changes, figure out what to do
  $: currentVideo?.uuid, updatePlayer();

  const play = () => {
    // buildActiveAudioSources(currentAudio.filter(Object));
    // if (audioContext) audioContext.resume();
    if (videoEl) videoEl.play();
  };

  const pause = () => {
    // track last time to calculate delta if scrubber moves during pause.
    lastTime = time;
    // clearActiveAudioSources();
    // if (audioContext) audioContext.suspend();
    if (videoEl) videoEl.pause();
  };

  // runs whenever time updates
  const updateSourcesAtPause = () => {
    // if we're not paused, don't do anything
    if (!paused) return;

    if (currentVideo) {
      if (videoEl) videoEl.currentTime = time - currentVideo.offset;
    }
  };

  const updatePlayer = async () => {
    if (!videoEl) return;
    if (!currentVideo) return;

    // console.log(`player has updated to ${currentVideo.uuid}`);

    await tick();

    if (!paused) {
      let dt = time - currentVideo.offset;
      videoEl.currentTime = dt;
      videoEl.play();
    }
  };

  let lastTimestamp = 0;
  let unplayed = [];
  const frame = (timestamp: DOMHighResTimeStamp) => {
    if (paused) {
      lastTimestamp = timestamp;
      requestAnimationFrame(frame);
      return;
    }

    // unplayed = currentAudio.filter((a) => a && !activeSources.has(a.uuid));

    // if (unplayed.length > 0) {
    //   buildActiveAudioSources(unplayed);
    // }

    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    time += delta / 1000;

    requestAnimationFrame(frame);
  };

  onMount(() => {
    audioContext = new AudioContext();
    requestAnimationFrame(frame);
  });

  // const clearActiveAudioSources = () => {
  //   if (!audioContext) return;

  //   for (const source of activeSources.values()) {
  //     source.stop();
  //   }

  //   activeSources.clear();
  // };

  // const buildActiveAudioSources = (clips: Clip[]) => {
  //   if (!audioContext) return;
  //   for (const clip of clips) {
  //     if (!clip) continue;
  //     if (activeSources.has(clip.uuid)) throw new Error("already playing");
  //     if (!clip.media.audio) continue;
  //     const buffer = clip.media.audio;
  //     const source = audioContext.createBufferSource();
  //     source.buffer = buffer;
  //     source.connect(audioContext.destination);

  //     activeSources.set(clip.uuid, source);

  //     const dt = time - clip.offset;

  //     source.start(0, dt, buffer.duration - dt);

  //     source.addEventListener("ended", () => {
  //       console.log("ended");
  //       activeSources.delete(clip.uuid);
  //     });
  //   }
  // };

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
    offset: time,
    start: 0,
    uuid: Math.random().toString(36).substring(7),
    z: z++,
  });

  let videoRow = 0;
  let audioRow = 0;
  let z = 0;

  $: getCurrentClip = (clips: Clip[]): Clip | null => {
    console.log("run");
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
    multiple
    bind:files
    on:change={resolveFiles}
  />
  <section>
    {#each resolved as file}
      <section>
        <h2>{file.title}</h2>
        <p>{file.duration}</p>
        <button
          on:click={() => {
            if (file.type === "audio") {
              audioClips[audioRow] = [
                ...audioClips[audioRow],
                createClip(audioClips[audioRow], file),
              ];
            } else {
              videoClips = [...videoClips, createClip(videoClips, file)];
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

      paused = true;
      // clearActiveAudioSources();
    }}
  >
    {#each { length: Math.ceil(time) } as _, i}
      <div class="tick" style="width: {TIME_SCALING}px; height: 100%">
        <p>{i}</p>
      </div>
    {/each}
  </div>
  <div class="row">
    <p style="position:absolute">v0</p>
    {#each videoClips as clip}
      <button
        class="clip"
        style="transform: translateX({clip.offset *
          TIME_SCALING}px); width: {clip.media.duration *
          TIME_SCALING}px; z-index:{clip.z};"
        on:click={() => (clip.z = Math.max(...videoClips.map((c) => c.z)) + 1)}
      >
        <p>{clip.uuid}, {clip.z}</p>
        <p>{clip.media.title}</p>
      </button>
    {/each}
  </div>
  {#each audioClips as clips, j}
    <div class="row">
      <p style="position:absolute">a{j}</p>
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
  <div
    class="scrubber"
    style="transform: translateX({time * TIME_SCALING}px; z-index: 9999999;"
  />
</div>

<section class="player">
  {#if currentVideo}
    {#if currentVideo.media.type === "video"}
      <video
        src={currentVideo.media.src}
        class="media"
        bind:this={videoEl}
        title={currentVideo.uuid}
      >
        <track kind="captions" />
      </video>
    {:else if currentVideo.media.type === "image"}
      <img
        src={currentVideo.media.src}
        class="media"
        alt=""
        bind:this={imgEl}
      />
    {/if}
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
    border: 1px solid rgb(71, 178, 142);
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
