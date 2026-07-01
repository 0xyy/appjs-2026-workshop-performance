# React Native Performance

# Setup

This guide is based around the 2026 App.js workshops app https://github.com/software-mansion-labs/appjs-2026-workshop-performance. The app was purposefully built with many performance issues - I’ll be using them for all practical examples and exercises in this guide. As a prerequisite, clone the repo and build the app following instructions in the README.md file.

**Tip:** As you go through the practical exercises in this guide, I highly recommend creating neat, incremental commits for each task you complete. Not only will this give you a clear history to look back on, but we will also occasionally roll back your work to explore alternative solutions.

# React Native DevTools

https://reactnative.dev/docs/react-native-devtools

React Native DevTools offer a suite of tools that can help you with profiling and debugging React Native apps. React Native DevTools is based on the Chrome DevTools frontend. If you have a web development background, its features should be familiar. You can take a look at the Chrome DevTools docs for additional resources and guides.

**Note:** For the remainder of this section I’ll be referring to **the React Native DevTools** as **the DevTools**. ****

## Configuration tips

You can access the configuration options via the **View Settings (`⚙︎`) icon**. Feel free to explore on your own, but here’s a handful of useful settings ****that I’d recommend:

In the General section, toggle the **"Highlight updates when components render"** option and try interacting with the app. The highlights allow you to see what actually re-renders as you tap. You might notice that the highlights vary in color - this indicates the frequency at which the components render (🟦 - least frequent, 🟨 - moderate, 🟥 - most frequent).

![](https://reactnative.dev/assets/images/debugging-rndt-highlight-renders-bc20258bbc79dba4fe1866c227943e37.gif)

**Tip:** The highlights come with a bit of overhead that will affect profiling results plus they can be a bit overwhelming at times. I’d recommend turning this on when you are trying to diagnose issues and keeping it off otherwise.

Another useful tool is located in the Profiler section settings - **“Record why each component rendered while profiling”**.

!image.png

With this setting, you should see a new **“Why did this render?”** section when you focus a component on the profiler tab:

!image.png

**Note:** Sometimes it’s difficult to figure out what’s actually causing the re-render by looking at this section (e.g. state updates are only marked as “State” with an index). If you open the component in the **“Components” tab**, you’ll see a complete list of its hooks (listed in the order they are called during a render). You can cross-reference this list with the code and the index numbers on the **“Profiler” tab** to figure out the exact line on which the hook is defined.

## State updates

The starting point of every re-render in React is a state update. When a component's state changes, that component re-renders, and by default so do all of its descendants - let's call this the **scope** of the update. A well-placed piece of state has the smallest scope it can while still doing its job.

**Note:** State updates aren't always explicitly written in your component. Many popular hooks manage state internally - e.g. TanStack Query (`useQuery`). When a network request resolves, those hooks trigger hidden state updates (toggling `isLoading` or updating `data`), which carry the exact same re-render cost as a local `useState` hook.

### Exercise 1.1 - a practical example with `PostDetailHeader`

The `PostDetailHeader` component can be found in the post details screen - you can access it by tapping on any post. Take a look at this component both in the app and in the code - do you notice any issues when interacting with this component? Try addressing this by refactoring the header slightly.

- Hint 1

  Try tapping the like button - notice that it causes a frame drop. Try recording this interaction with the profiler tab and analyze the result.

- Hint 2

  Tapping the like button causes state updates in the `PostDetailScreen` component - the scope of these changes includes the entire comment list. We can extract these states into the `PostDetailHeader` component to limit their scope.

### Exercise 1.2 - going deeper

When working on the previous exercise, you might have noticed that we still haven’t fully narrowed the state update scope. Take another look at the `PostDetailHeader` component - can you think of a follow up refactor that will further limit the scope? Compared to the previous example, this might require a bit more effort and won’t be as impactful, but it’s still worth it.

**Note:** Your solution to the previous exercise might have gone beyond what was expected. If you feel like that’s the case feel free to look at the hints - you might have already completed this exercise.

- Hint 1

  We’re still looking at the like button - just as in the previous example, let’s figure out the scope of its updates. This time, we’ll use the **“Highlight re-renders”** option - turn it on and tap the like button. Did you notice any components that are in the scope, but don’t change visually when the likes state updates?

- Hint 2

  The likes update has the entire `PostDetailHeader` in its scope. While this isn’t as big of a deal as with the `PostDetailScreen`, the scope is still far from ideal. Let’s extract the likes and shares action bar part of the header into a new component (e.g. `PostActionsBar`).

## Memoization

In the previous section, we’ve explored how you can limit **the scope** of a state update by moving the state deeper into the component tree. This technique has a major limitation - we can’t move **some** child components out of the scope of one state - all children are in the scope of each state. Similarly, we can’t define a finer scope for different **state values**. To address this, we can use memoization.

**Note:** In some cases, you can restructure your code to reduce which components are children of the component that updates. Here’s a great example of this technique by Dan Abramov - https://overreacted.io/before-you-memo/#solution-2-lift-content-up.

### Memo

https://react.dev/reference/react/memo

`memo` allows you to tell React not to update a component if a condition is met. By default this condition is “are the props shallow equal?” - if they are, React skips the re-render and reuses the result from the previous render instead. Since components receive parent state as props, we can selectively ignore some updates.

### Caching values

https://react.dev/reference/react/useMemo

I’ve mentioned, that by default, `memo` does a shallow comparison on props to check if a component should update. This is fine for primitive values, but for objects this means comparison by reference. If we create “the same” object in the component body like this:

```jsx
const myObj = {
  firstName: 'John',
  lastName: 'Doe',
};
```

It’ll be re-created on each render, which means new reference. If we were to pass this to a child component wrapped with `memo` it’d re-render each time the parent re-renders - this disables memoization. To address this, we can use `useMemo` to keep the object from changing:

```jsx
const myStableObj = useMemo(
  () => ({
    firstName: 'John',
    lastName: 'Doe',
  }),
  [],
);
```

**Note:** in this basic case, we could move this object to the global scope, which would keep its reference stable. However, objects often depend on props or state - extracting to global scope wouldn’t really work in those scenarios.

Another common use-case for `useMemo` is skipping heavy operations. Let’s consider the following scenario:

_We have an inbox list component that displays a gmail style list of messages. Additionally it has a toggle to filter out read messages._

```jsx
function InboxList({messages}:{messages: ReadonlyArray<Message>}) {
	// other state

	const [filterUnread, setFilterUnread] = useState(false);

  const filteredMessages = messages.filter(
		message => filterUnread ? !message.isRead : true
	);

	// return ...
}
```

As you can see, each time `InboxList` re-renders it has to go through potentially thousands of items to check if they should be filtered out or not. In reality, we only care about re-calculating `filteredMessages` if either `messages` or `filterUnread` changes. We can use `useMemo` to achieve this:

```jsx
function InboxList({messages}:{messages: ReadonlyArray<Message>}) {
	// other state

	const [filterUnread, setFilterUnread] = useState(false);

	const filteredMessages = useMemo(
		() => messages.filter(message => filterUnread ? !message.isRead : true),
		[messages, filterUnread],
	);

	// return ...
}
```

**Note:** Filtering long lists in JavaScript is not really that computationally expensive, but if the component itself re-renders often this adds unnecessary overhead.

### Caching functions

https://react.dev/reference/react/useCallback

`useCallback` functions very similarly to `useMemo`, but is used to memoize functions instead of values. Since functions are also compared by reference, we can use this hook to make them stable and safe to pass to `memo`ized components.

**Note:** Since functions are objects in JS, you could technically memoize them with `useMemo`, but this tends to be a bit difficult to read - `useCallback` provides a nicer interface for this scenario.

### Exercise 2.1 - heavy operation in `PostDetailScreen`

Take a look at the `PostDetailScreen` component - try recording a few interactions using the **Performance** tab in the **DevTools**. Do you notice anything?

- Hint 1

  Take a look at the Components track in the Performance tab. Can you see any anomalies in the graph?

- Hint 2

  The `PostDetailScreen`’s render function seems to have a large overhead - it looks like it does some heavy operations whenever it renders:

  !image.png

### **Exercise** 2.2 - memoization in practice **`BookmarkButton`**

We’ve seen how `useMemo` and `useCallback` can prevent re-creating functions and variables on each render, but often, the actual expensive operation is re-rendering the children. This is where `memo` comes into play - try wrapping the `BookmarkButton` component with it, profile tapping the like button on the post details screen, and observe if `BookmarkButton` still re-renders with the rest of the page.

### **Exercise** 2.3 - **`ShareButton`**

The previous memoization example was effective, but a bit basic. Let’s take a look at a slightly more interesting example - the **`ShareButton`**. Memoize and profile it as you did in the previous exercise. Did the memoization work? If not, try to fix it.

- Hint 1

  Think about how `memo` checks if the component should re-render.

- Hint 2

  Take a look at the props - notice that `onShareComplete` is recreated on each render. What’s the simplest way to keep it stable?

### React compiler

https://react.dev/learn/react-compiler

Manually adding `useMemo` and `useCallback` everywhere introduces a ton of repetitive boilerplate, and the React Compiler is the answer to that exact problem. It is a build-time tool that automatically handles memoization so you don't have to think about it. Because its primary goal is absolute correctness, the compiler operates conservatively - it will skip optimizing certain blocks if it cannot safely guarantee identical behavior. As a consequence, if your initial architecture has fundamental performance flaws, the compiler will faithfully preserve those flaws rather than fix them.

### Exercise 2.4 - using **React Compiler**

https://react.dev/learn/react-compiler/installation

Follow the guide above to install the React Compiler. Once installed, undo exercises 2.1-2.3, then profile `PostDetailScreen`, `BookmarkButton`, and `ShareButton` to compare the results.

## Concurrent rendering

When a user interacts with a React Native app, the UI responds by re-rendering the affected components. This operation is **blocking** - after the interaction the app is “stuck” until the update finishes.

Since React 18, renders no longer have to be **strictly blocking**. You can use **transitions** to mark updates as less urgent. **Transition updates** are executed after the regular, **urgent updates** and are **non-blocking -** the user can interact with the application as if the update wasn’t triggered. Additionally, **transitions** **are interruptible** - if a new interaction would override the result of a pending transition, that transition is discarded. You can observe this on the **Scheduler custom track** in the **Performance tab**. **Urgent updates** are shown on the **blocking** **subtrack**, while **transition updates** are fittingly on the **transition subtrack**.

In this section, we will learn how you can “move” the heavier updates to the transition track to make the UI more responsive.

### The render lifecycle

!react_native_debugging_new_performance_panel_in_react_native_0_83_21ca90871f6d_inline_5_04e609ca5b.gif

Each UI update goes through five distinct stages:

- **Update:** React schedules a state change, marking the specific component subtree that needs to re-render.
- **Render:** React executes the JavaScript component functions in that scope to generate a new element tree. The renderer (Fabric) uses this to construct a C++ **Shadow Tree**.
- **Commit:** React synchronously submits the changes. The C++ Shadow Tree is promoted as the "next tree" to be mounted, and layout calculations (via the Yoga engine) are triggered. This stage also fires layout effects like `useLayoutEffect`.
- **Waiting for Paint:** The JS thread yields while the main (UI) thread prepares to mount the new elements. If React schedules passive effects to run _before_ the host platform draws the pixels, this pauses as a standard **Waiting** state.
- **Remaining Effects:** React executes all passive effects (`useEffect`) caused by the render. This usually happens asynchronously right after the layout is painted to the screen.

### useTransition

I’ve mentioned that React renders no longer have to be blocking - we can achieve this using `useTransition`. With it, you gain access to the `startTransition` function.

Any **action** (a callback that updates some state) passed to `startTransition` will cause **transition updates** instead of **blocking updates**.

```jsx
function TabContainer() {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState('about');

  function selectTab(nextTab) {
    startTransition(() => {
      setTab(nextTab);
    });
  }
  // ...
}
```

In addition to `startTransition`, we also get access to the `isPending` variable. It will be set to `true` as long as a transition is pending. You can use this to give feedback to the user that something is happening in the background - e.g. conditionally render a spinner or gray out old data.

!useTransitionShowcase2 (1).gif.gif)

In the example above, we can assume that switching tabs causes a heavy render of another tab. Instead of blocking the user while the tab mounts, we can briefly show that the tab is about to switch, while allowing them to interact with the current tab or even cancel the action by tapping on another tab.

### **useDeferredValue**

`useTransition` allows you to mark entire updates as transitions - you can say that this happens **producer side**. Sometimes, however, you’d like to invert this and only have **some consumers** treat updates as transitions. For example, a fast rendering header can reflect an update immediately, while a heavy list renders in the background. This is exactly what `useDeferredValue` does.

```jsx
import { useState, useDeferredValue } from 'react';

function SearchPage() {
  const [searchValue, setSearchValue] = useState('');
  const deferredSearchValue = useDeferredValue(searchValue);
  // ...
}
```

`useDeferredValue` accepts a value and mirrors it - after the original value changes, a new transition will start where its deferred counterpart updates.

### Exercise 3.1 - **transitions in practice**

Take a look at `PostDetailScreen` - can you see any heavy components or operations that could be deferred with transitions?

- **Hint 1**

  Some screen elements are located off-screen initially - for example, the footer. Deferring their initial render keeps the screen mounting instantly.

- **Hint 2**

  Think back to how we’ve exercised scoping state. With transitions, you can mark a certain state update as a transition, which will move all the renders it causes to the transition track.

### Exercise 3.2 - **another approach**

Let’s try a different approach to transitions - if you’ve used `useTransition` in the previous exercise, try re-implementing it with `useDeferredValue` (or `useTransition` if it’s the other way around).

# List performance

Lists are one of the most notorious components when it comes to poor performance. At **60fps** you only get **16ms** per frame to get a component ready for paint (or 8ms at 120fps). This is the budget we get for the entire list - divide this by the number of rows on the screen and you get the per-row budget. We don’t get a lot of time, so every mistake matters.

In this section we’ll explore 3 levers we can pull to make lists faster.

## Lever 1 - Draw less

When you do paint a row, make it cheap. What blows up paint cost in any list.

- Svg icons mount dozens of native subviews per row
- Shadows, elevations and blurs
- Images decode at source resolution, not display size
- Shimmers and loop animations paint every cell, every frame

### Exercise 1.1 - use expo-image

Replace every `Image` from `react-native` in the feed with `Image` from `expo-image`, and load each photo at a resolution close to how it actually appears on screen. A profile avatar shown 40px wide does not need a 1024px file behind it.

- Hint

  Import `Image` from `expo-image` and swap it into the carousel, the avatars, and the suggested-post cards. For sizing, check if your image URL or CDN accepts a size parameter and request a smaller variant. Aim for the rendered size times the device pixel ratio (so a 40px avatar wants an 80x80 file on a 2x screen).

- Explanation

  Image memory and decode cost are driven by the source bitmap's pixel count, not by the size it ends up rendered at. A multi-megapixel photo decoded for a 40px avatar still allocates the full bitmap, and on a scrolling list the decoder runs constantly while memory pressure spikes. React Native's built-in `Image` decodes the full source on every mount and doesn't share decoded bitmaps across mounts, so the same photo is re-decoded each time it returns to the visible window. `expo-image` keeps a decoded-bitmap cache, uses a faster decoder, and exposes `contentFit`, cache policies, and native crossfade. Combine that with serving a right-sized URL and the per-frame work the JS thread has to do during scroll collapses.

### Exercise 1.2 - remove shimmers

Delete the custom shimmer placeholder components that animate a glowing bar while each image loads. Let `expo-image` show a blurhash (or thumbhash) preview instead - a tiny blurry version of the image baked into its metadata that fades out the moment the real photo arrives.

```tsx
const DEFAULT_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';
```

- Hint

  Drop the `ImageWithShimmer` wrapper at every feed call site and pass `placeholder={{ blurhash }}` to `expo-image` directly. For carousel images, avatars and suggested-post images, define a constant near the component and reuse it everywhere:

  Once nothing imports the shimmer files, delete `src/components/feed/shimmer/` entirely.

- Explanation

  A custom shimmer is typically an `Animated.View` running a looping opacity animation. Every visible instance adds a wrapper view, an animation graph, and a frame-by-frame interpolation. Even with the native driver, you still mount the subtree per cell; without it, the loop is paced from JS and competes with scroll on the same thread. The placeholder built to hide jank ends up producing it. A blurhash placeholder is a short string the image library decodes once into a tiny bitmap and renders as the source until the real image arrives, then crossfades natively. No per-frame work, no extra views per cell, no animation graph running while the user scrolls past.

### Exercise 1.3 - replace SVG

Swap the SVG icons used inside feed rows (heart, comment, share, bookmark, three-dot menu, verified badge, location pin, etc.) for native platform symbols. iOS gets SF Symbols, Android gets Material icons, and the operating system renders them directly.

- Hint

  The project already has a wrapper (`IconSymbol` in `src/components/ui/icon-symbol.tsx`) that resolves to SF Symbols on iOS and Material on Android. Replace every SVG icon imported from `src/components/feed/icons/` with an `IconSymbol` call.

  **Action-bar icons** (in `action-buttons.tsx`, `like-button.tsx`, `share-button.tsx`, `bookmark-button.tsx`, `comment-preview.tsx`, `comment-item.tsx`):

  - `HeartIcon` (filled) → `heart.fill`
  - `HeartIcon` (outline) → `heart`
  - `CommentIcon` → `bubble.right`
  - `ShareIcon` → `paperplane`
  - `BookmarkIcon` (filled) → `bookmark.fill`
  - `BookmarkIcon` (outline) → `bookmark`

  **Post header** (in `post-header.tsx`):

  - `VerifiedIcon` → `checkmark.seal.fill`

  **Post options menu** (in `post-options-menu.tsx`, replace each `MenuIcon name="..."`):

  - `bell` → `bell`
  - `link` → `link`
  - `share` → `square.and.arrow.up`
  - `person` → `person`
  - `eye-slash` → `eye.slash`
  - `flag` → `flag`

  All of these are already declared in the `MAPPING` object in `icon-symbol.tsx`, so no extra wiring is required. Once nothing imports from `src/components/feed/icons/` you can delete the directory.

- Explanation

  `react-native-svg` mounts each icon as a native view containing one subnode per path, circle, or group. A simple icon often expands to several native nodes the renderer measures, lays out, and paints. Across a row's worth of icons and the rows visible at once, that becomes hundreds of native subtrees describing shapes that never change between frames. Native symbols (SF Symbols on iOS, Material on Android) resolve to a single OS-cached image per icon, with no per-icon subtree to maintain. The icon set collapses to a handful of trivial image views, and the render tree the OS has to walk gets dramatically smaller.

## Lever 2 - Render less

This section is all about preventing unnecessary renders. In the previous chapter, we’ve explored using React’s `memo` in order to “cut off” the parent-child rendering chain. This technique is especially efficient in lists - not all children need to re-render when the parent does.

If the data array changes often - we should ensure stable item keys. This ensures that inserting/removing items doesn’t re-mount all items.

Heavy calculations at item level will repeat for each item - moving these to the list level ensures they only run once (per render). Similarly, avoid `useEffect` - if each item triggers an effect, things can get out of hand quickly (especially if it causes cascading updates).

### Exercise 2.1 - stable key

Make sure FlatList's `keyExtractor` returns the same value for the same item across every render. The key is the row's permanent name tag - it tells the list 'this is still the row you saw last time, just update what's inside.'

- Hint

  Return the item's own stable ID, like `item.id`. Never use the array index. Never use `Math.random()`. Never use anything that gets recomputed on each render. The function reference doesn't matter, only the value it returns.

- Explanation

  Keys are how React matches children across renders. With a stable key, React reuses the existing component instance, its hooks, its local state, and the underlying native view; the update is a prop diff against the tree that already exists. With an unstable key, React treats the row as a different component on every render: it unmounts the old instance (hooks discarded, native views destroyed, effects torn down) and mounts a fresh one (constructor, layout pass, effects fired). Mount is roughly an order of magnitude more expensive than update. Unstable keys quietly turn every parent re-render into a wave of remounts across the list, which is exactly what virtualization was supposed to avoid.

### Exercise 2.2 - stable data array

Stop storing the entire list array in screen-level state just to flip a 'liked' flag on a single row. Move that per-row state down to the smallest component that actually owns the interaction (the like button), so liking one post doesn't shake the whole feed.

- Hint

  Spot the `useState<FeedListItem[]>` at the screen level paired with an `onLike` handler that does `setFeedData(prev => prev.map(...))`. Delete both. Move `isLiked` and `likes` into `action-buttons.tsx` as local state where the tap happens. With state local, the screen-level data array can be defined once and stay reference-stable for the whole session.

- Explanation

  FlatList shallow-compares the `data` prop to decide whether to diff. When the list array lives in screen state and any per-row interaction does `setData(prev => prev.map(...))`, every interaction produces both a new array reference _and_ new item-object references. The list re-evaluates every cell, and each memoized row receives a freshly-built `item` prop, which breaks reference equality and bypasses `React.memo` entirely. An interaction that should touch a single component ends up walking the entire visible window. The fix is to push per-row state into the smallest component that owns the interaction. Once you do, the screen-level array can be defined once and stay reference-stable for the whole session, and updates never escape the component that triggered them.

### Exercise 2.3 - heavy operations

Use the profiler to find heavy functions burning CPU during scroll, then fix them. The point of this task is the workflow, not the specific lines: _record a trace, sort by self-time, open the suspect, decide whether the work needs to happen at all_. Two patterns are guaranteed to surface that way - synchronous loops doing dead work in a 'harmless' helper, and `useEffect`s that just mirror a prop into state and force a second render.

- Hint

  Profile a real scroll session - don't guess by reading files:

  1. **React DevTools Profiler** for component-level cost. Run the app in dev, open React DevTools, switch to the **Profiler** tab, press record, scroll for a few seconds, stop. The **Ranked** chart shows which components re-render most often; the **Flamegraph** shows where time is spent inside a single commit. Anything that re-renders on every scroll frame, or sits visibly wider than its neighbours in the flamegraph, is worth opening.

  The profiler will name the files for you - you don't need to memorise them.

- Explanation

  Frames usually don't drop because of one expensive call. They drop because the JS thread is permanently slightly behind, and the cost is spread across many small functions that look innocent in isolation. A profiler is the only honest way to find that work: it ranks functions by how much time they actually take, so a wasted loop hiding inside a 'formatter' or a useless `useEffect` cascade shows up at the top of the list regardless of how clean the source looks. Without the profiler you're guessing - and the most expensive function in any codebase is almost never the one you'd predict. With it, every fix is justified by a measurement, and you stop the moment the trace looks flat.

### Exercise 2.4 - memoize

To stop your list items from re-drawing unnecessarily, make sure the props you pass them don't keep changing. You need to use these three tools together:

- **React.memo:** Wrap the row component itself.
- **useCallback:** Wrap any functions passed to the row (like click handlers).
- **useMemo:** Wrap any arrays or objects passed to the row.

The catch: They only work as a team. If you use `useMemo` on the row but pass it a brand-new function, the row will still re-draw anyway.

Don’t guess blindly, always compare before and after!

- Hint

  Three patterns to apply on the feed:

  1. `useMemo` around derived values built during render - like `formatTags(tags)` in `TagList`, or the resolved `Colors[colorScheme]` object in the screen.
  2. `useCallback` around `renderItem` for FlatList/FlashList, and around any handler you pass down to a memoized child.
  3. `React.memo` around `FeedItem` so identical rows skip rendering when the parent re-renders.

  Skip memoization for primitives, for callbacks passed to non-memoized children, and for trivially cheap derived values. The bookkeeping costs more than it saves.

- Explanation

  `React.memo` bails out when its props are shallow-equal to the previous render. Bailout requires non-primitive props (functions, objects, arrays) to keep the same reference. An inline `() => ...` or `{ ... }` written in JSX produces a fresh reference on every render, so the memoized child re-renders anyway and the wrapper becomes pure overhead. `useCallback` and `useMemo` preserve those references as long as their dependencies are unchanged. The three pieces only pay off as a system: memoized consumer, stable callback identity, stable derived value identity. Apply one alone and the bailout never fires. Apply all three and re-renders stop at the boundary you drew, which is what every memo wrapper was supposed to buy you.

## Lever 3 - Recycle smarter

To handle large arrays, React Native relies on **virtualization** - maintaining only a small window of active items in the native view tree at any given time. While this keeps memory consumption low, scrolling performance depends entirely on how offscreen components are handled.

#### FlatList - windowing

Offscreen cells **unmount**, then **remount** when they scroll back in. Saves memory. Doesn't save the expensive part: **mount cost**.

!image.png

#### FlashList - recycling

Offscreen cells go into a **pool** . New ones scroll on, FlashList pulls a view tree from the pool and updates props. No constructor, no fresh native views

!image.png

### Exercise 3.1 - configuring FlatList

Review FlatList's render-window props (`initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `removeClippedSubviews`). Unless you've measured and have a clear reason to change them, leave them at the defaults. The team that built FlatList already picked sensible numbers.

- Hint

  Open the FlatList in `feed-list.tsx`. If someone has hand-tuned these props without a measurement to back it up, remove the overrides. If you do tune them, change one at a time and check FPS on a real device both before and after - never two at once.

- Explanation

  Four knobs decide how aggressively FlatList virtualizes, and each one trades a different axis:

  - **`initialNumToRender`** (default `10`): how many items render in the very first batch, before any scroll happens. Higher means the first viewport is filled faster but the initial mount is more expensive; lower means quicker time-to-interactive but a brief gap below the fold.
  - **`maxToRenderPerBatch`** (default `10`): how many items render per incremental batch while the user scrolls. Bigger batches mean fewer hand-offs to the gesture but each one is longer (and can stall a frame); smaller batches are smoother but rows pop in later during a fast fling.
  - **`windowSize`** (default `21`): how many _viewports_ worth of items stay mounted at once. Default 21 ≈ 10 viewports above, 1 visible, 10 below. Higher keeps more rows ready during fast scroll (smoother, more memory); lower saves memory but blanks rows when the user outruns the renderer.
  - **`removeClippedSubviews`** (default platform-dependent): when on, off-screen native views are detached from the view hierarchy to cut native render cost. It has a long history of bugs with nested scrollables, animations, and absolutely-positioned children - especially on iOS - so it's a 'measure first' toggle, not a free win.

  These knobs interact non-linearly with row height, screen size, and device class. The defaults are calibrated against a typical mobile list and are usually fine. Tuning them without a profiler trace and a target metric is gambling: a value that papers over symptoms on one device often regresses another, and you only catch the regression when a user complains. Measure first, change one knob at a time, verify on real hardware.

### Exercise 3.2 - inspect onScroll

Audit every `onScroll` handler in the feed for expensive work running on every single event. Two anti-patterns hide in this codebase: a per-frame `setState` driving the scroll-progress bar at the top of `FeedList`, and a per-frame `setState` tracking the active page in `ImageCarousel`.

- Hint

  There are two distinct fixes depending on what the handler is actually doing:

  1. If you only need the _settled_ value once the gesture stops (like the carousel's active page after a swipe), switch to `onMomentumScrollEnd`. One call when the gesture finishes instead of one per frame.
  2. If you need the _continuous_ scroll position to animate a UI element (like the scroll-progress bar at the top of `FeedList`), move the handler to the UI thread with Reanimated's `useAnimatedScrollHandler` + `useSharedValue` + `useAnimatedStyle`. React never sees the events.

  `onScroll` fires on or near every frame. Setting React state inside it triggers a full re-render per event - almost always wrong.

- Explanation

  To understand why this matters, you need a clear picture of the two threads at play.

  The **UI thread** (the OS's main thread) is what draws every frame and processes every touch. When a user drags a list, the OS is computing the new scroll offset, updating native view positions, and asking the GPU to redraw at the screen's refresh rate - 60, 90, or 120 Hz. If this thread misses a frame deadline, the user sees jank. It cannot afford to be slow.

  The **JS thread** is a separate worker thread where your JavaScript runs: components, hooks, reducers, business logic, React reconciliation. The two threads communicate asynchronously - native events get forwarded to JS, JS schedules native updates back. That messaging is 'the bridge' in the old architecture and a JSI call in the new one, but either way it's a context switch with non-zero cost.

  When `onScroll` is wired to a regular JS handler, every scroll event the UI thread emits gets queued for the JS thread to process. At the default throttle that's roughly one event per frame. A `setState` inside that handler triggers a render on the JS thread - the same thread that needs to keep up with the next event in the queue. Backpressure builds: events pile up, JS falls behind, and the gesture feels rubbery because the UI thread's scroll position now lags behind the user's finger.

  There are two ways out.

  **`onMomentumScrollEnd`** doesn't change threads - it just fires once per gesture instead of once per frame. If your UI only needs the _settled_ value (which page a carousel landed on, which row is at the top after scrolling stops), one event per swipe is enough and the JS thread barely notices.

  **Reanimated worklets** move the handler off the JS thread entirely. Reanimated spins up a second JavaScript runtime _on the UI thread_ - same language, separate instance. A worklet is a regular JS function tagged with the `'worklet'` directive (or auto-tagged when passed to a Reanimated API) that the runtime hoists into that UI-thread runtime at module load. Once it's there, the function runs synchronously on the UI thread with no cross-thread messaging.

  `useAnimatedScrollHandler` registers such a worklet, so scroll events from the native scroll view are delivered straight to JS-on-the-UI-thread. The worklet reads and writes `useSharedValue` boxes (thread-safe storage Reanimated provides, mutations visible to both runtimes), and `useAnimatedStyle` (also a worklet) projects those shared values onto native view props on the same thread that's about to paint the next frame. The main JS thread never sees the scroll events, the entire feedback loop stays on the thread that owns the screen, and the gesture stays locked to the user's finger no matter what React is doing in the background.

### Exercise 3.3 - using FlashList

Replace FlatList with `@shopify/flash-list` and tell it which row types your feed has via `getItemType`. FlashList recycles a finished row by handing it back with new data - but it can only recycle into a row of the same shape.

- Hint

  Import `FlashList` from `@shopify/flash-list`. The feed has two row types: regular feed posts and suggested-posts sections. Return a different string from `getItemType` for each (`"post"` vs `"suggestions"`), and make sure `renderItem` returns the right component based on the type.

- Explanation

  FlatList's 'virtualization' is really _windowing_. Items more than a few viewports outside the visible area are unmounted: the React tree is discarded, the native views destroyed. When the user scrolls back, those items are mounted from scratch - constructor, render, layout pass, effects, native view creation. Windowing saves memory, but it doesn't save mount cost. Long lists with heavy cells (carousels, images, nested content) pay the full mount tax every time a cell re-enters the window, and that mount work runs on the JS thread - the same thread processing the next scroll event. This is the root cause of the dropped frames you see when fast-scrolling a FlatList feed.

  FlashList borrows the design behind Android's `RecyclerView` and iOS's `UICollectionView`: instead of unmounting offscreen cells, it puts them into a _recycle pool_. When a new cell scrolls on, FlashList pulls a view tree out of the pool and just updates its props. React reconciles the new props against the existing tree - no constructor, no native view creation, no fresh layout pass, no remount of subtrees the diff didn't touch. Scroll cost stops scaling with how _heavy_ each cell is and starts scaling with how _different_ the incoming data is from the outgoing data, which is usually small. `getItemType` returns a string tag per row, and FlashList keeps a separate recycle pool per tag. Heterogeneous lists (posts and section headers, ads and content, anything with a different shape) get type-correct reuse instead of falling back to tear-down and remount.

  There are other options in this space. **Legend List** is a newer pure-JS recycler (no native module) with an API close to FlatList's, strong benchmarks under the new architecture, and active development. It's worth keeping on your radar, and the architectural lesson generalises: any time you have a long list of diverse, mount-expensive cells, a recycler-based list is the right shape, regardless of which library you pick. For this workshop we're going with FlashList because the migration from FlatList is nearly drop-in - same `data`, `renderItem`, and `keyExtractor` API, with `getItemType` as the only new concept - and it's been battle-tested in shipping production apps for years.

### Exercise 3.4 - sub-mapping with `getMappingKey`

Wherever you `.map()` over a sub-array inside a FlashList cell (the dots under an image carousel, the images themselves, the tag list, the comment preview list), use `getMappingKey` from `useMappingHelper` so React can match up the children correctly when the cell is recycled.

- Hint

  Pull `const { getMappingKey } = useMappingHelper()` from `@shopify/flash-list` inside any component that maps over sub-items in a FlashList row. Replace `key={item.id}` with `key={getMappingKey(item.id, i)}`. Apply it to the image carousel, the dot indicators, the tag list, the comment preview list - anywhere `.map()` appears inside a feed cell.

- Explanation

  When a FlashList cell recycles, the outer component instance is reused but its props change to the new row's data. Inside that cell, `.map()`-ed children are matched by their React keys. Identity-based keys like `key={item.id}` describe the new data correctly, but reconciliation sees them as an entirely different child set than what the recycled cell rendered last, so it unmounts the old children and mounts new ones. The parent recycles; the subtree doesn't. `getMappingKey` from `useMappingHelper` returns a key tied to slot position inside the recycled cell, letting React match children by their place in the layout and update them in place. The whole subtree recycles with the cell instead of churning every time.

### Exercise 3.5 - nesting FlashList

For horizontal carousels embedded inside feed rows (like the 'Suggested for you' strip), use a nested horizontal `FlashList` instead of `.map()`-ing all the cards into a `ScrollView`. Only the visible thumbnails get rendered; the rest wait their turn off-screen.

- Hint

  Find the `ScrollView` + `.map()` pattern in `suggested-posts-section.tsx`. Replace it with a horizontal `FlashList` (`horizontal={true}`) rendering the same card component. The outer feed FlashList will host the inner one without any special setup.

- Explanation

  `.map()` is eager: every iteration produces a React element, and every parent render reconciles all of them whether or not they're on screen. A horizontal carousel built as `ScrollView` + `.map()` over twenty items mounts twenty cards, twenty images, and twenty wrapper views even when only three fit in the viewport. Inside an outer virtualized list, that cost is paid in full every time the carousel row enters the recycle pool. A nested virtualized list (a horizontal FlashList) extends virtualization to the inner axis: only items inside the visible window plus a small buffer mount, and the section's cost stops scaling with the inner array's length.

### Bonus

https://github.com/vercel-labs/agent-skills/tree/main/skills/react-native-skills#list-performance-high

Here’s a couple of list related skills by Vercel. Try using them to solve one of the previous exercises and analyze the result.

# Native performance

## UI Thread & Responsiveness

## Memory Management
