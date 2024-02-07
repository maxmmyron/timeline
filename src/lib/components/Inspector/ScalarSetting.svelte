<script lang="ts">
  import { onMount } from "svelte";

  export let name: string;
  export let scalar: number;
  let defaultVal: number = 0;

  onMount(() => {
    defaultVal = scalar;
  });

  /**
   * Whether or not the numerical override input can exceed the bounds defined
   * by the `min` and `max` props.
   */
  export let strictBounds: boolean = false;

  export let props: svelteHTML.HTMLProps<
    "input",
    svelteHTML.HTMLAttributes<any>
  > & {
    min: number;
    max: number;
    step: number;
  };
</script>

<article class="flex items-center gap-1">
  <label class="flex items-center gap-1">
    <p>{name}</p>
    <input
      class="border border-zinc-300 rounded-md dark:bg-zinc-900 dark:border-zinc-800"
      type="number"
      {...props}
      bind:value={scalar}
    />
  </label>
  <input
    type="number"
    bind:value={scalar}
    alt="Manual {name} property entry"
    on:change={(e) => {
      let parsed = parseFloat(e.currentTarget.value);
      if (strictBounds)
        scalar = Math.min(props.max, Math.max(props.min, parsed));
      else scalar = parsed;
    }}
  />
  <output>
    <p>{scalar}</p>
  </output>
  <button on:click={() => (scalar = defaultVal)}>↻</button>
</article>
