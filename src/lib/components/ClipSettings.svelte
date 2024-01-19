<script lang="ts">
  export let clip: App.Clip;
  export let settingsOpen = false;

  export let scaleX = 1;
  export let scaleY = 1;
  export let translateX = 0;
  export let translateY = 0;

  $: clip.matrix = [
    scaleX ?? 1,
    0,
    0,
    scaleY ?? 1,
    translateX ?? 0,
    translateY ?? 0,
  ] as App.Matrix;
</script>

{#if settingsOpen}
  <article class="settings-container">
    <div class="button-container">
      <button on:click={() => (settingsOpen = false)}>close</button>
      <button on:click={() => (clip.matrix = [1, 0, 0, 1, 0, 0])}>
        reset
      </button>
    </div>

    <p>Scale</p>
    <label class="setting">
      <p>X</p>
      <input type="number" bind:value={scaleX} />
    </label>
    <label class="setting">
      <p>Y</p>
      <input type="number" bind:value={scaleY} />
    </label>

    <p>Translate</p>
    <label class="setting">
      <p>X</p>
      <input type="number" bind:value={translateX} />
    </label>
    <label class="setting">
      <p>Y</p>
      <input type="number" bind:value={translateY} />
    </label>
  </article>
{/if}

<style>
  .settings-container {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
  }

  .settings-container > .button-container {
    grid-area: 1/1/2/4;
    display: flex;
    justify-content: center;
    gap: 0.5rem;
  }

  .setting {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  input {
    max-width: 2rem;
  }
</style>
