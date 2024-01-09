<script lang="ts">
  export let file: App.Media;
</script>

<article>
  <header>
    <p>{file.title}</p>
    <p>{file.duration}s</p>
  </header>
  <button on:click>add</button>
</article>

<style>
  article {
    padding: 0.5rem;
    border-radius: 4px;
    background-color: rgba(200 200 200 / 0.5);
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  article > header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  header > p:first-child {
    font-weight: bold;
  }

  button {
    border: none;
    border-radius: 4px;
    background-color: white;
    height: fit-content;
    padding: 0.25rem 0.5rem;
  }

  button:hover {
    background-color: rgba(240 240 240 / 1);
  }
</style>
