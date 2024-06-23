<script lang="ts" generics="T extends unknown[], U extends unknown[]">
  export let transform: (...args: T) => U;

  export let inputs: Parameters<typeof transform>;
  $: outputs = transform(...inputs);

  export { outputs };

  export let title: string;
</script>

<article class="rounded-md shadow-lg border-zinc-900 bg-zinc-925">
  <header class="py-0.5 border-b border-zinc-900">
    <p class="font-mono uppercase text-zinc-600 text-center">
      {title}
    </p>
  </header>
  <main class="flex py-1.5 gap-2 relative">
    {#if inputs}
      <ul class="flex-col relative -left-1">
        {#each inputs as input}
          <li class="flex items-center gap-1">
            <div
              class="w-[9px] h-[9px] rounded-full bg-blue-400 border border-blue-400/25"
            ></div>
            <!-- <p>{input.name}</p>? -->
          </li>
        {/each}
      </ul>
    {/if}
    <div class="flex-grow">
      <slot />
    </div>
    {#if outputs}
      <ul class="flex-col relative -right-1">
        {#each outputs as output}
          <li class="flex items-center gap-1">
            <!-- <p>{output.name}</p> -->
            <div
              class="w-[9px] h-[9px] rounded-full bg-blue-400 border border-blue-400/25"
            ></div>
          </li>
        {/each}
      </ul>
    {/if}
  </main>
</article>
