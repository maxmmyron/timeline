<script>
  /**
   * @typedef { Object } Clip
   * @property { number } duration duration of clip
   * @property { number } offset offset from start of video
   * @property { number } start start time relative clip 00:00 time
   * @property { string } uuid unique identifier
   * @property { number } z z offset relative to other clips
   */

  /**
   * @param { number } duration
   * @param { number } offset
   * @param { number } start
   */
  const createClip = (duration, offset, start) => ({ duration, offset, start, uuid: Math.random().toString(36).substring(7), z: z++ });

  /**
   * @type { Clip[][] }
   */
  let videoClips = [[]];

  /**
   * @type { Clip[][] }
   */
  let audioClips = [[]];

  let videoRow = 0;
  let audioRow = 0;
  let currTime = 0;
  let z = 0;

  $: vPos = videoClips[videoRow].reduce((acc, curr) => acc + curr.duration, 0);
  $: aPos = audioClips[audioRow].reduce((acc, curr) => acc + curr.duration, 0);

  
  $: getCurrentClip = (clips) => {
    console.log("recalc");
    /**
     * @type { Clip[] }
     */
    let valid = [];
    for (const clip of clips) {
      if (clip.offset < currTime && clip.offset + clip.duration > currTime) valid.push(clip);
      if (clip.offset > currTime) break;
    }
    return valid.sort((a, b) => b.z - a.z)[0];
  }
</script>

<section>
  <button on:click={() => (videoClips = [...videoClips, []])}>+ vrow</button>
  <button on:click={() => (audioClips = [...audioClips, []])}>+ arow</button>
</section>

<section>
  <label for="video-row">video row</label>
  <input type="range" min="0" max={videoClips.length - 1} bind:value={videoRow} name="video-row" />
  <output for="video-row">{videoRow}</output>

  <label for="audio-row">audio row</label>
  <input type="range" min="0" max={audioClips.length - 1} bind:value={audioRow} name="audio-row" />
  <output for="audio-row">{audioRow}</output>

  <button on:click={() => (videoClips[videoRow] = [...videoClips[videoRow], createClip(Math.random() * 200 + 50, vPos + Math.random()*200, 0)])}>+ vclip</button>
  <button on:click={() => (audioClips[audioRow] = [...audioClips[audioRow], createClip(Math.random() * 200 + 50, aPos + Math.random()*200, 0)])}>+ aclip</button>
</section>

<section>
  <label for="currTime">currTime</label>
  <input bind:value={currTime} type="range" min="0" max="1200" />
  <output for="currTime">{currTime}</output>
</section>

<section>
  {#each videoClips as clips,i}
    <p>v{i} current: {getCurrentClip(clips)?.uuid}</p>
  {/each}
  {#each audioClips as clips,i}
    <p>a{i} current: {getCurrentClip(clips)?.uuid}</p>
  {/each}
</section>

<div class="timeline">
  {#each [videoClips, audioClips] as xClips, i}
    {#each xClips as clips, j}
      <div class="row">
        <p style="position:absolute">{i===0?"v":"a"}{j}</p>
        {#each clips as clip}
          <button class="clip" style="transform: translateX({clip.offset}px); width: {clip.duration}px; z-index:{clip.z};" on:click={() => clip.z = Math.max(...clips.map(c => c.z)) + 1}>
            <p>{clip.uuid}, {clip.z}</p>
          </button>
        {/each}
      </div>
    {/each}
    <hr />
  {/each}
  <div class="scrubber" style="transform: translateX({currTime}px); z-index: 9999999;" />
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
    margin-top: 32px;
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
