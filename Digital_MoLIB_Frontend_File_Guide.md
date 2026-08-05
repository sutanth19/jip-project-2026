# Digital MoLIB Frontend — Folder and File Function Guide
## Architecture summary
- **Framework:** React 19 + TypeScript + Vite.
- **Routing:** React Router with protected role-based route trees.
- **Server state:** TanStack React Query.
- **Client auth state:** React Context + Zustand.
- **Forms:** React Hook Form + Zod.
- **UI:** Tailwind CSS, shadcn/Radix primitives, Lucide icons, Framer Motion.
- **Interactive learning:** dnd-kit, canvas/pointer drawing, browser audio recording.
## Main runtime flow
`main.tsx` → `App.tsx` → router → `AppProviders` → public/auth/protected layout → role page → feature hook → API client → backend.
## Folder purpose
- **`src/assets`** — Images, logos, and static visual assets.
- **`src/components`** — Reusable UI outside a single business feature.
- **`src/config`** — Navigation, roles, constants, theme, and data-driven module configurations.
- **`src/constants`** — Environment and stable constants.
- **`src/contexts`** — Global React contexts.
- **`src/features`** — Business modules grouped by domain.
- **`src/hooks`** — Cross-feature React hooks.
- **`src/layouts`** — Route shells for each role and public/auth screens.
- **`src/lib`** — Core HTTP and utility infrastructure.
- **`src/pages`** — Top-level public, authentication, and error pages.
- **`src/providers`** — Composition of app-wide providers.
- **`src/routes`** — Router and access-control logic.
- **`src/services`** — Backend-facing service layer.
- **`src/stores`** — Zustand stores.
- **`src/styles`** — Global/theme CSS.
- **`src/types`** — Global TypeScript types.
- **`src/utils`** — Cross-feature helpers.

## Every source file

### `src/App.tsx`
- **`src/App.tsx`** — Root component; renders the React Router provider.

### `src/assets/images`
- **`src/assets/images/hero.png`** — Static image/logo asset used by the interface.
- **`src/assets/images/image1.svg`** — Static image/logo asset used by the interface.
- **`src/assets/images/login_img.png`** — Static image/logo asset used by the interface.
- **`src/assets/images/logo.png`** — Static image/logo asset used by the interface.
- **`src/assets/images/logo.svg`** — Static image/logo asset used by the interface.
- **`src/assets/images/logo_web.svg`** — Static image/logo asset used by the interface.

### `src/assets/react.svg`
- **`src/assets/react.svg`** — Static image/logo asset used by the interface.

### `src/components/auth`
- **`src/components/auth/AuthBrandPanel.tsx`** — Displays the role-sensitive image and branding beside the login form.
- **`src/components/auth/LoginForm.tsx`** — Handles role selection, credentials/PIN input, validation, and login submission.
- **`src/components/auth/PasswordInput.tsx`** — Password field with visibility toggle and shared styling.

### `src/components/common`
- **`src/components/common/Container.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/components/common/Logo.tsx`** — Frontend module used by the Digital MoLIB application.

### `src/components/dashboard`
- **`src/components/dashboard/ActivityStatus.tsx`** — Reusable dashboard navigation, metrics, chart, or header component.
- **`src/components/dashboard/DashboardHeader.tsx`** — Reusable dashboard navigation, metrics, chart, or header component.
- **`src/components/dashboard/DashboardPage.tsx`** — Reusable dashboard navigation, metrics, chart, or header component.
- **`src/components/dashboard/DashboardThemeToggle.tsx`** — Reusable dashboard navigation, metrics, chart, or header component.
- **`src/components/dashboard/DashboardTopbar.tsx`** — Reusable dashboard navigation, metrics, chart, or header component.
- **`src/components/dashboard/ProgressChart.tsx`** — Reusable dashboard navigation, metrics, chart, or header component.
- **`src/components/dashboard/QuickActions.tsx`** — Reusable dashboard navigation, metrics, chart, or header component.
- **`src/components/dashboard/RecentActivities.tsx`** — Reusable dashboard navigation, metrics, chart, or header component.
- **`src/components/dashboard/SchoolSwitcher.tsx`** — Reusable dashboard navigation, metrics, chart, or header component.
- **`src/components/dashboard/Sidebar.tsx`** — Reusable dashboard navigation, metrics, chart, or header component.
- **`src/components/dashboard/SidebarNav.tsx`** — Reusable dashboard navigation, metrics, chart, or header component.
- **`src/components/dashboard/SidebarUser.tsx`** — Reusable dashboard navigation, metrics, chart, or header component.
- **`src/components/dashboard/StatsCards.tsx`** — Reusable dashboard navigation, metrics, chart, or header component.

### `src/components/landing`
- **`src/components/landing/About.tsx`** — Landing-page section or visual component.
- **`src/components/landing/Announcements.tsx`** — Landing-page section or visual component.
- **`src/components/landing/Cta.tsx`** — Landing-page section or visual component.
- **`src/components/landing/Faq.tsx`** — Landing-page section or visual component.
- **`src/components/landing/Features.tsx`** — Landing-page section or visual component.
- **`src/components/landing/Footer.tsx`** — Landing-page section or visual component.
- **`src/components/landing/Hero.tsx`** — Landing-page section or visual component.
- **`src/components/landing/HeroIconSlider.tsx`** — Landing-page section or visual component.
- **`src/components/landing/Roles.tsx`** — Landing-page section or visual component.
- **`src/components/landing/Statistics.tsx`** — Landing-page section or visual component.
- **`src/components/landing/card-tone.ts`** — Landing-page section or visual component.

### `src/components/layout`
- **`src/components/layout/Footer.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/components/layout/Navbar.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/components/layout/PublicThemeSurface.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/components/layout/Sidebar.tsx`** — Frontend module used by the Digital MoLIB application.

### `src/components/shared`
- **`src/components/shared/ConfirmDialog.tsx`** — Reusable application-wide component for tables, states, badges, dialogs, or page structure.
- **`src/components/shared/DataTable.tsx`** — Reusable application-wide component for tables, states, badges, dialogs, or page structure.
- **`src/components/shared/DeleteDialog.tsx`** — Reusable application-wide component for tables, states, badges, dialogs, or page structure.
- **`src/components/shared/EmptyState.tsx`** — Reusable application-wide component for tables, states, badges, dialogs, or page structure.
- **`src/components/shared/ErrorState.tsx`** — Reusable application-wide component for tables, states, badges, dialogs, or page structure.
- **`src/components/shared/LoadingSpinner.tsx`** — Reusable application-wide component for tables, states, badges, dialogs, or page structure.
- **`src/components/shared/LoadingState.tsx`** — Reusable application-wide component for tables, states, badges, dialogs, or page structure.
- **`src/components/shared/PageContainer.tsx`** — Reusable application-wide component for tables, states, badges, dialogs, or page structure.
- **`src/components/shared/PageHeader.tsx`** — Reusable application-wide component for tables, states, badges, dialogs, or page structure.
- **`src/components/shared/Pagination.tsx`** — Reusable application-wide component for tables, states, badges, dialogs, or page structure.
- **`src/components/shared/RoleBadge.tsx`** — Reusable application-wide component for tables, states, badges, dialogs, or page structure.
- **`src/components/shared/SchoolBadge.tsx`** — Reusable application-wide component for tables, states, badges, dialogs, or page structure.
- **`src/components/shared/SearchInput.tsx`** — Reusable application-wide component for tables, states, badges, dialogs, or page structure.
- **`src/components/shared/SectionCard.tsx`** — Reusable application-wide component for tables, states, badges, dialogs, or page structure.
- **`src/components/shared/StatusBadge.tsx`** — Reusable application-wide component for tables, states, badges, dialogs, or page structure.
- **`src/components/shared/index.ts`** — Reusable application-wide component for tables, states, badges, dialogs, or page structure.

### `src/components/theme-provider.tsx`
- **`src/components/theme-provider.tsx`** — Provides light/dark/system theme behavior to descendant components.

### `src/components/ui`
- **`src/components/ui/alert-dialog.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/avatar.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/badge-variants.ts`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/badge.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/breadcrumb.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/button-variants.ts`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/button.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/card.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/carousel.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/checkbox.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/collapsible.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/dropdown-menu.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/field.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/infinite-slider.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/input.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/label.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/progress.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/radio-group.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/separator.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/sheet.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/sidebar-context.ts`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/sidebar.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/skeleton.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/tabs.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.
- **`src/components/ui/tooltip.tsx`** — Reusable shadcn/Radix-based low-level UI primitive.

### `src/config/constants.ts`
- **`src/config/constants.ts`** — Central configuration for labels, navigation, roles, theme, or entity definitions.

### `src/config/navigation.ts`
- **`src/config/navigation.ts`** — Defines dashboard sidebar links and role-based navigation visibility.

### `src/config/roles.ts`
- **`src/config/roles.ts`** — Defines supported roles, labels, and role-related helpers.

### `src/config/theme.ts`
- **`src/config/theme.ts`** — Central configuration for labels, navigation, roles, theme, or entity definitions.

### `src/constants/env.ts`
- **`src/constants/env.ts`** — Application constants and environment-variable access.

### `src/contexts/AuthContext.tsx`
- **`src/contexts/AuthContext.tsx`** — Restores the session and exposes login, student login, logout, and current-user state.

### `src/contexts/auth-context-value.ts`
- **`src/contexts/auth-context-value.ts`** — React Context definition/provider for shared application state.

### `src/features/activity-player`
- **`src/features/activity-player/ActivityContext.tsx`** — Stores current activity, item position, answers, scoring, and navigation state.
- **`src/features/activity-player/ActivityPlayerPage.tsx`** — Route page that loads an activity and places it inside the player shell.
- **`src/features/activity-player/ActivityPlayerShell.tsx`** — Main activity layout combining header, instructions, renderer, footer, progress, and completion.
- **`src/features/activity-player/ActivityRenderer.tsx`** — Chooses and renders the correct player based on rendererKey.
- **`src/features/activity-player/activity-player-context-value.ts`** — Core activity-player orchestration, context, registry, navigation, and rendering logic.
- **`src/features/activity-player/activity-player.utils.ts`** — Core activity-player orchestration, context, registry, navigation, and rendering logic.
- **`src/features/activity-player/components/ActivityFooter.tsx`** — Shared activity-player shell component such as header, timer, progress, instructions, or completion state.
- **`src/features/activity-player/components/ActivityHeader.tsx`** — Shared activity-player shell component such as header, timer, progress, instructions, or completion state.
- **`src/features/activity-player/components/CompletionScreen.tsx`** — Shared activity-player shell component such as header, timer, progress, instructions, or completion state.
- **`src/features/activity-player/components/EmptyActivity.tsx`** — Shared activity-player shell component such as header, timer, progress, instructions, or completion state.
- **`src/features/activity-player/components/ErrorState.tsx`** — Shared activity-player shell component such as header, timer, progress, instructions, or completion state.
- **`src/features/activity-player/components/InstructionPanel.tsx`** — Shared activity-player shell component such as header, timer, progress, instructions, or completion state.
- **`src/features/activity-player/components/LoadingState.tsx`** — Shared activity-player shell component such as header, timer, progress, instructions, or completion state.
- **`src/features/activity-player/components/MediaViewer.tsx`** — Shared activity-player shell component such as header, timer, progress, instructions, or completion state.
- **`src/features/activity-player/components/ProgressBar.tsx`** — Shared activity-player shell component such as header, timer, progress, instructions, or completion state.
- **`src/features/activity-player/components/Timer.tsx`** — Shared activity-player shell component such as header, timer, progress, instructions, or completion state.
- **`src/features/activity-player/components/UnsupportedRenderer.tsx`** — Shared activity-player shell component such as header, timer, progress, instructions, or completion state.
- **`src/features/activity-player/hooks/useActivity.ts`** — Reusable React hook that loads, manages, or updates feature data/state.
- **`src/features/activity-player/hooks/useActivityNavigation.ts`** — Reusable React hook that loads, manages, or updates feature data/state.
- **`src/features/activity-player/hooks/useActivityProgress.ts`** — Reusable React hook that loads, manages, or updates feature data/state.
- **`src/features/activity-player/interactions/DndProvider.tsx`** — Shared drag-and-drop/pairing interaction infrastructure for activity renderers.
- **`src/features/activity-player/interactions/DraggableLearningCard.tsx`** — Shared drag-and-drop/pairing interaction infrastructure for activity renderers.
- **`src/features/activity-player/interactions/DroppableLearningZone.tsx`** — Shared drag-and-drop/pairing interaction infrastructure for activity renderers.
- **`src/features/activity-player/interactions/dnd-accessibility.ts`** — Shared drag-and-drop/pairing interaction infrastructure for activity renderers.
- **`src/features/activity-player/interactions/dnd.types.ts`** — TypeScript data types for this module.
- **`src/features/activity-player/interactions/dnd.utils.ts`** — Shared drag-and-drop/pairing interaction infrastructure for activity renderers.
- **`src/features/activity-player/interactions/pairing.types.ts`** — TypeScript data types for this module.
- **`src/features/activity-player/interactions/pairing.utils.ts`** — Shared drag-and-drop/pairing interaction infrastructure for activity renderers.
- **`src/features/activity-player/renderer-registry.tsx`** — Maps each renderer key to the correct learning activity player component.
- **`src/features/activity-player/renderers/ArrangeLettersPlayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/ArrangeSyllablesPlayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/ComingSoonRenderer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/CopyWritingPlayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/DragDropPlayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/FillInBlankPlayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/FreeHandwritingPlayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/MatchingPlayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/MultipleChoicePlayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/ReadingComprehensionPlayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/ReadingPlayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/TrueFalsePlayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/VoiceRecordingPlayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/WordBuilderPlayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/arrange-letters/ArrangeLettersBoard.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/arrange-letters/ArrangeLettersFeedback.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/arrange-letters/LetterAnswerRow.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/arrange-letters/LetterBank.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/arrange-letters/LetterTile.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/arrange-letters/arrange-letters.types.ts`** — TypeScript data types for this module.
- **`src/features/activity-player/renderers/arrange-letters/arrange-letters.utils.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/arrange-syllables/ArrangeSyllablesBoard.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/arrange-syllables/ArrangeSyllablesFeedback.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/arrange-syllables/SyllableAnswerRow.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/arrange-syllables/SyllableBank.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/arrange-syllables/SyllableTile.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/arrange-syllables/arrange-syllables.types.ts`** — TypeScript data types for this module.
- **`src/features/activity-player/renderers/arrange-syllables/arrange-syllables.utils.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/copy-writing/CopyWritingCanvas.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/copy-writing/CopyWritingDrawingLayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/copy-writing/CopyWritingFeedback.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/copy-writing/CopyWritingGuideLayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/copy-writing/CopyWritingHint.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/copy-writing/CopyWritingReference.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/copy-writing/CopyWritingToolbar.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/copy-writing/copy-writing-layout.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/copy-writing/copy-writing.types.ts`** — TypeScript data types for this module.
- **`src/features/activity-player/renderers/copy-writing/copy-writing.utils.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/drag-drop/DragDropBoard.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/drag-drop/DragDropFeedback.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/drag-drop/DraggableItemCard.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/drag-drop/DropZoneCard.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/drag-drop/drag-drop.types.ts`** — TypeScript data types for this module.
- **`src/features/activity-player/renderers/drag-drop/drag-drop.utils.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/fill-in-the-blank/FillBlankFeedback.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/fill-in-the-blank/FillBlankHint.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/fill-in-the-blank/FillBlankInput.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/fill-in-the-blank/FillBlankQuestion.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/fill-in-the-blank/FillBlankWordBank.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/fill-in-the-blank/fill-in-the-blank.types.ts`** — TypeScript data types for this module.
- **`src/features/activity-player/renderers/fill-in-the-blank/fill-in-the-blank.utils.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/free-handwriting/FreeHandwritingCanvas.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/free-handwriting/FreeHandwritingDrawingLayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/free-handwriting/FreeHandwritingFeedback.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/free-handwriting/FreeHandwritingGuideLayer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/free-handwriting/FreeHandwritingHint.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/free-handwriting/FreeHandwritingPrompt.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/free-handwriting/FreeHandwritingToolbar.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/free-handwriting/free-handwriting-layout.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/free-handwriting/free-handwriting.types.ts`** — TypeScript data types for this module.
- **`src/features/activity-player/renderers/free-handwriting/free-handwriting.utils.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/matching/MatchingBoard.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/matching/MatchingFeedback.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/matching/MatchingItemCard.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/matching/matching.types.ts`** — TypeScript data types for this module.
- **`src/features/activity-player/renderers/matching/matching.utils.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/multiple-choice/MultipleChoiceFeedback.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/multiple-choice/MultipleChoiceOption.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/multiple-choice/MultipleChoiceQuestion.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/multiple-choice/multiple-choice.types.ts`** — TypeScript data types for this module.
- **`src/features/activity-player/renderers/multiple-choice/multiple-choice.utils.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/reading/ReadingAudioControls.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/reading/ReadingCountdown.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/reading/ReadingFeedback.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/reading/ReadingHint.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/reading/ReadingPanel.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/reading/ReadingToolbar.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/reading/reading.types.ts`** — TypeScript data types for this module.
- **`src/features/activity-player/renderers/reading/reading.utils.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/reading-comprehension/ReadingFeedback.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/reading-comprehension/ReadingNavigation.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/reading-comprehension/ReadingOption.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/reading-comprehension/ReadingPassage.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/reading-comprehension/ReadingQuestionCard.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/reading-comprehension/reading.parser.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/reading-comprehension/reading.types.ts`** — TypeScript data types for this module.
- **`src/features/activity-player/renderers/reading-comprehension/reading.utils.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/true-false/TrueFalseOption.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/true-false/TrueFalseQuestion.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/true-false/true-false.types.ts`** — TypeScript data types for this module.
- **`src/features/activity-player/renderers/true-false/true-false.utils.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/voice-recording/VoiceRecordingControls.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/voice-recording/VoiceRecordingFeedback.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/voice-recording/VoiceRecordingPermissionState.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/voice-recording/VoiceRecordingPlayback.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/voice-recording/VoiceRecordingPrompt.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/voice-recording/VoiceRecordingTimer.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/voice-recording/voice-recording.media.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/voice-recording/voice-recording.types.ts`** — TypeScript data types for this module.
- **`src/features/activity-player/renderers/voice-recording/voice-recording.utils.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/word-builder/WordBuilderAnswerRow.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/word-builder/WordBuilderBank.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/word-builder/WordBuilderBoard.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/word-builder/WordBuilderFeedback.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/word-builder/WordBuilderHint.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/word-builder/WordBuilderTile.tsx`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/renderers/word-builder/word-builder.types.ts`** — TypeScript data types for this module.
- **`src/features/activity-player/renderers/word-builder/word-builder.utils.ts`** — Activity renderer or renderer-specific subcomponent used to run one learning activity type.
- **`src/features/activity-player/types.ts`** — TypeScript data types for this module.
- **`src/features/activity-player/useActivityPlayer.ts`** — Core activity-player orchestration, context, registry, navigation, and rendering logic.

### `src/features/admin`
- **`src/features/admin/api/admin.api.ts`** — API client functions for this feature and its backend endpoints.
- **`src/features/admin/api/dashboard.api.ts`** — API client functions for this feature and its backend endpoints.
- **`src/features/admin/components/AdminFilterBar.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/features/admin/components/AdminForm.tsx`** — Dynamic admin CRUD form generated from admin entity configuration.
- **`src/features/admin/components/AdminLifecycleActions.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/features/admin/components/AdminMetricCard.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/features/admin/components/AdminPageHeader.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/features/admin/components/AdminRecordDetails.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/features/admin/components/AdminRecordTable.tsx`** — Reusable table for displaying admin records and row actions.
- **`src/features/admin/components/AdminUnsupportedNotice.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/features/admin/config.ts`** — Frontend module used by the Digital MoLIB application.
- **`src/features/admin/hooks/use-admin-query-state.ts`** — Reusable React hook that loads, manages, or updates feature data/state.
- **`src/features/admin/hooks/use-admin-records.ts`** — Reusable React hook that loads, manages, or updates feature data/state.
- **`src/features/admin/pages/AdminDashboardPage.tsx`** — Route-level page component rendered by React Router.
- **`src/features/admin/pages/AdminEntityDetailPage.tsx`** — Route-level page component rendered by React Router.
- **`src/features/admin/pages/AdminEntityFormPage.tsx`** — Route-level page component rendered by React Router.
- **`src/features/admin/pages/AdminEntityListPage.tsx`** — Route-level page component rendered by React Router.
- **`src/features/admin/pages/AdminProfilePage.tsx`** — Route-level page component rendered by React Router.
- **`src/features/admin/pages/AdminReportsPage.tsx`** — Route-level page component rendered by React Router.
- **`src/features/admin/pages/AdminSettingsPage.tsx`** — Route-level page component rendered by React Router.
- **`src/features/admin/types/admin.types.ts`** — TypeScript data types for this module.
- **`src/features/admin/utils/record.ts`** — Pure helper functions for formatting, parsing, validation, or state transformations.

### `src/features/ai`
- **`src/features/ai/api/ai.api.ts`** — API client functions for this feature and its backend endpoints.
- **`src/features/ai/components/AiHumanReviewBanner.tsx`** — Warns that AI-generated output requires human/teacher review.
- **`src/features/ai/pages/AiPages.tsx`** — Route-level page component rendered by React Router.

### `src/features/builder`
- **`src/features/builder/api/builder.api.ts`** — API client functions for this feature and its backend endpoints.
- **`src/features/builder/components/ActivityWizard.tsx`** — Displays the multi-step digital activity creation workflow.
- **`src/features/builder/components/BuilderBadges.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/features/builder/components/BuilderFilterBar.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/features/builder/components/BuilderForm.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/features/builder/components/BuilderRecordTable.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/features/builder/components/MediaPreviewCard.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/features/builder/components/SafeRecordDetails.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/features/builder/config.ts`** — Frontend module used by the Digital MoLIB application.
- **`src/features/builder/hooks/use-builder-query-state.ts`** — Reusable React hook that loads, manages, or updates feature data/state.
- **`src/features/builder/hooks/use-builder-records.ts`** — Reusable React hook that loads, manages, or updates feature data/state.
- **`src/features/builder/pages/BuilderDetailPage.tsx`** — Route-level page component rendered by React Router.
- **`src/features/builder/pages/BuilderFormPage.tsx`** — Route-level page component rendered by React Router.
- **`src/features/builder/pages/BuilderListPage.tsx`** — Route-level page component rendered by React Router.
- **`src/features/builder/pages/CurriculumHomePage.tsx`** — Route-level page component rendered by React Router.
- **`src/features/builder/pages/CurriculumNestedPage.tsx`** — Route-level page component rendered by React Router.
- **`src/features/builder/pages/DigitalActivityPreviewPage.tsx`** — Loads a digital activity and previews it through the real activity player.
- **`src/features/builder/types/builder.types.ts`** — TypeScript data types for this module.
- **`src/features/builder/utils/builder-record.ts`** — Pure helper functions for formatting, parsing, validation, or state transformations.

### `src/features/notifications`
- **`src/features/notifications/api/notifications.api.ts`** — API client functions for this feature and its backend endpoints.
- **`src/features/notifications/components/NotificationBell.tsx`** — Shows unread notification count and notification access in the dashboard.
- **`src/features/notifications/pages/NotificationPages.tsx`** — Route-level page component rendered by React Router.

### `src/features/parent`
- **`src/features/parent/api/parent.api.ts`** — API client functions for this feature and its backend endpoints.
- **`src/features/parent/components/ParentComponents.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/features/parent/hooks/use-parent.ts`** — Reusable React hook that loads, manages, or updates feature data/state.
- **`src/features/parent/pages/ParentPages.tsx`** — Route-level page component rendered by React Router.
- **`src/features/parent/types/parent.types.ts`** — TypeScript data types for this module.
- **`src/features/parent/utils/parent-record.ts`** — Pure helper functions for formatting, parsing, validation, or state transformations.

### `src/features/student`
- **`src/features/student/api/student.api.ts`** — API client functions for this feature and its backend endpoints.
- **`src/features/student/components/StudentComponents.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/features/student/hooks/use-student.ts`** — Reusable React hook that loads, manages, or updates feature data/state.
- **`src/features/student/pages/StudentPages.tsx`** — Route-level page component rendered by React Router.
- **`src/features/student/types/student.types.ts`** — TypeScript data types for this module.
- **`src/features/student/utils/student-record.ts`** — Pure helper functions for formatting, parsing, validation, or state transformations.

### `src/features/teacher`
- **`src/features/teacher/api/teacher.api.ts`** — API client functions for this feature and its backend endpoints.
- **`src/features/teacher/components/TeacherComponents.tsx`** — Frontend module used by the Digital MoLIB application.
- **`src/features/teacher/hooks/use-teacher.ts`** — Reusable React hook that loads, manages, or updates feature data/state.
- **`src/features/teacher/pages/TeacherPages.tsx`** — Route-level page component rendered by React Router.
- **`src/features/teacher/types/teacher.types.ts`** — TypeScript data types for this module.
- **`src/features/teacher/utils/teacher-record.ts`** — Pure helper functions for formatting, parsing, validation, or state transformations.

### `src/hooks/use-auth.ts`
- **`src/hooks/use-auth.ts`** — Reusable React hook that loads, manages, or updates feature data/state.

### `src/hooks/use-mobile.ts`
- **`src/hooks/use-mobile.ts`** — Reusable React hook that loads, manages, or updates feature data/state.

### `src/index.css`
- **`src/index.css`** — Global or theme styling rules for the frontend.

### `src/layouts/AdminLayout.tsx`
- **`src/layouts/AdminLayout.tsx`** — Shared page shell that arranges navigation, sidebar, header, and nested route content.

### `src/layouts/AuthLayout.tsx`
- **`src/layouts/AuthLayout.tsx`** — Shared page shell that arranges navigation, sidebar, header, and nested route content.

### `src/layouts/DashboardLayout.tsx`
- **`src/layouts/DashboardLayout.tsx`** — Shared page shell that arranges navigation, sidebar, header, and nested route content.

### `src/layouts/ParentLayout.tsx`
- **`src/layouts/ParentLayout.tsx`** — Shared page shell that arranges navigation, sidebar, header, and nested route content.

### `src/layouts/PublicLayout.tsx`
- **`src/layouts/PublicLayout.tsx`** — Shared page shell that arranges navigation, sidebar, header, and nested route content.

### `src/layouts/StudentLayout.tsx`
- **`src/layouts/StudentLayout.tsx`** — Shared page shell that arranges navigation, sidebar, header, and nested route content.

### `src/layouts/TeacherLayout.tsx`
- **`src/layouts/TeacherLayout.tsx`** — Shared page shell that arranges navigation, sidebar, header, and nested route content.

### `src/lib/api.ts`
- **`src/lib/api.ts`** — Configured Axios client, auth headers, refresh/error behavior, and common request helpers.

### `src/lib/auth-routes.ts`
- **`src/lib/auth-routes.ts`** — Core infrastructure helper such as Axios configuration, route mapping, theme, or class merging.

### `src/lib/theme.ts`
- **`src/lib/theme.ts`** — Core infrastructure helper such as Axios configuration, route mapping, theme, or class merging.

### `src/lib/utils.ts`
- **`src/lib/utils.ts`** — Core infrastructure helper such as Axios configuration, route mapping, theme, or class merging.

### `src/main.tsx`
- **`src/main.tsx`** — Application entry point; mounts React into #root and enables StrictMode.

### `src/pages/LandingPage.tsx`
- **`src/pages/LandingPage.tsx`** — Route-level page component rendered by React Router.

### `src/pages/LoginPage.tsx`
- **`src/pages/LoginPage.tsx`** — Route-level page component rendered by React Router.

### `src/pages/auth`
- **`src/pages/auth/ChangeFirstPasswordPage.tsx`** — Route-level page component rendered by React Router.
- **`src/pages/auth/ChangeFirstPinPage.tsx`** — Route-level page component rendered by React Router.
- **`src/pages/auth/ForgotPasswordPage.tsx`** — Route-level page component rendered by React Router.
- **`src/pages/auth/LoginPage.tsx`** — Route-level page component rendered by React Router.

### `src/pages/errors`
- **`src/pages/errors/ErrorPage.tsx`** — Route-level page component rendered by React Router.

### `src/providers/AppProviders.tsx`
- **`src/providers/AppProviders.tsx`** — Top-level provider composition for auth, queries, theme, and notifications.

### `src/providers/ToastProvider.tsx`
- **`src/providers/ToastProvider.tsx`** — Top-level provider composition for auth, queries, theme, and notifications.

### `src/providers/toast-context-value.ts`
- **`src/providers/toast-context-value.ts`** — Top-level provider composition for auth, queries, theme, and notifications.

### `src/routes/guards.tsx`
- **`src/routes/guards.tsx`** — Protects routes by authentication state and allowed user roles.

### `src/routes/index.tsx`
- **`src/routes/index.tsx`** — React Router definitions, route authorization guards, or route policy helpers.

### `src/routes/route-policy.ts`
- **`src/routes/route-policy.ts`** — Defines redirect/permission decisions for authenticated users and first-login flows.

### `src/services/auth.service.ts`
- **`src/services/auth.service.ts`** — Service layer that calls backend APIs and converts responses for the app.

### `src/stores/auth-store.ts`
- **`src/stores/auth-store.ts`** — Zustand store for persistent client-side state.

### `src/styles/globals.css`
- **`src/styles/globals.css`** — Global or theme styling rules for the frontend.

### `src/styles/theme.css`
- **`src/styles/theme.css`** — Global or theme styling rules for the frontend.

### `src/types/auth.ts`
- **`src/types/auth.ts`** — TypeScript interfaces and types defining this feature’s data contracts.

### `src/utils/date.ts`
- **`src/utils/date.ts`** — Pure helper functions for formatting, parsing, validation, or state transformations.

### `src/utils/permissions.ts`
- **`src/utils/permissions.ts`** — Pure helper functions for formatting, parsing, validation, or state transformations.

### `src/utils/status.ts`
- **`src/utils/status.ts`** — Pure helper functions for formatting, parsing, validation, or state transformations.

## Test files
- **`test/activity-player.test.tsx`** — Vitest coverage for activity player.
- **`test/admin-module.test.tsx`** — Vitest coverage for admin module.
- **`test/arrange-letters.test.tsx`** — Vitest coverage for arrange letters.
- **`test/arrange-syllables.test.tsx`** — Vitest coverage for arrange syllables.
- **`test/builder-module.test.tsx`** — Vitest coverage for builder module.
- **`test/copy-writing.test.tsx`** — Vitest coverage for copy writing.
- **`test/drag-drop.test.tsx`** — Vitest coverage for drag drop.
- **`test/fill-in-the-blank.test.tsx`** — Vitest coverage for fill in the blank.
- **`test/free-handwriting.test.tsx`** — Vitest coverage for free handwriting.
- **`test/frontend-foundation.test.tsx`** — Vitest coverage for frontend foundation.
- **`test/matching.test.tsx`** — Vitest coverage for matching.
- **`test/multiple-choice.test.ts`** — Vitest coverage for multiple choice.
- **`test/parent-module.test.tsx`** — Vitest coverage for parent module.
- **`test/reading.test.tsx`** — Vitest coverage for reading.
- **`test/student-module.test.tsx`** — Vitest coverage for student module.
- **`test/teacher-module.test.tsx`** — Vitest coverage for teacher module.
- **`test/true-false.test.ts`** — Vitest coverage for true false.
- **`test/voice-recording.test.tsx`** — Vitest coverage for voice recording.
- **`test/word-builder.test.tsx`** — Vitest coverage for word builder.

## Important findings
- The project uses a **feature-based architecture**, which is suitable for a production system and easier to maintain than placing every page/component in one folder.
- Admin and curriculum builder pages are **configuration-driven**: one generic page/form/table supports many entities by reading `config.ts`.
- The activity player uses a **renderer registry**, allowing new activity types to be added without rewriting the entire player.
- Access is protected at the route level through `RequireAuth`, `RequireRole`, and role-specific guards. Backend authorization is still required; frontend guards alone are not security.
- There are two login-page paths in the source (`src/pages/LoginPage.tsx` and `src/pages/auth/LoginPage.tsx`). The router currently imports the auth-folder version; the other appears to be a compatibility re-export or older path and should be checked before removal.
- The uploaded ZIP includes `node_modules`, `dist`, `src.zip`, and macOS `__MACOSX` metadata. These should normally not be committed or shared; use `.gitignore` and package-lock instead.
- Automated tests could not start in this Linux inspection environment because the uploaded `node_modules` was created for another platform and is missing the Linux Rolldown native binding. A clean `npm install` on the target machine should regenerate platform-correct dependencies.
