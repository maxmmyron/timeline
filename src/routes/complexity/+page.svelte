<script>

    let x = 0, y = 0;

    let numMapAwaitGC = 0, numRefMapAwaitGC = 0;
    
    /**
     * @type {Map<number, {a: {a: number, b: number, c: number}, b: {a: number, b: number, c: number}, c: {a: number, b: number, c: number}}>}
     */
    let map = new Map();

    /**
     * @type {Map<number, WeakRef<{a: {a: number, b: number, c: number}, b: {a: number, b: number, c: number}, c: {a: number, b: number, c: number}}>>}
     */
    let refMap = new Map();

    const registry = new FinalizationRegistry(key => {
        console.log("gc'd");
        numMapAwaitGC -= 1;
    });
    const refRegistry = new FinalizationRegistry(key => {
        console.log("ref gc'd");
        numRefMapAwaitGC -= 1;
    });

    const add = () => {
        const bigObj = {
            a: {
                a: Math.random(),
                b: Math.random(),
                c: Math.random(),
            },
            b: {
                a: Math.random(),
                b: Math.random(),
                c: Math.random(),
            },
            c: {
                a: Math.random(),
                b: Math.random(),
                c: Math.random(),
            },
        };

        const refBigObj = {
            a: {
                a: Math.random(),
                b: Math.random(),
                c: Math.random(),
            },
            b: {
                a: Math.random(),
                b: Math.random(),
                c: Math.random(),
            },
            c: {
                a: Math.random(),
                b: Math.random(),
                c: Math.random(),
            },
        };

        let ref = new WeakRef(refBigObj);

        registry.register(bigObj, "ref");
        refRegistry.register(ref, "ref");

        map.set(x++, bigObj);
        refMap.set(y++, ref);

        map = map;
        refMap = refMap;
    };
</script>

<button on:click={add}>add</button>
<button on:click={() => {
    console.log(map.get(x - 1));
    console.log(refMap.get(y - 1)?.deref());
}}>log curr</button>

<button on:click={() => {
    console.log([...map.values()]);
    console.log([...refMap.values()].map(ref => ref.deref()));
    }}>logall</button>
<button on:click={() => {
    if(map.size <= 0) return;
    map.delete(--x);
    map = map;
    numMapAwaitGC += 1;
    }}>delete map</button>
<button on:click={() => {
    if(refMap.size <= 0) return;
    refMap.delete(--y);
    refMap = refMap;
    numRefMapAwaitGC += 1;
}}>delete refMap</button>

<p>map awaiting gc: {numMapAwaitGC}</p>
<p>refMap awaiting gc: {numRefMapAwaitGC}</p>

<p>{map.size}</p>
<p>{refMap.size}</p>

{#each [...map.values()] as obj}
    <div>
        {obj.a.a}
    </div>
{/each}

<p>----------------------------</p>


{#each [...refMap.values()].map(ref => ref.deref()) as ref}
    <div>
        {ref?.a.a}
    </div>
{/each}
