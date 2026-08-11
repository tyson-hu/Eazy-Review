import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { DimensionStepperRow } from '@/src/components/ui/DimensionStepperRow';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { HeaderBackButton } from '@/src/components/ui/HeaderBackButton';
import { Input } from '@/src/components/ui/Input';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { Screen } from '@/src/components/ui/Screen';
import { useAuth } from '@/src/features/auth/hooks';
import { productDetailReturnPath } from '@/src/features/auth/returnPath';
import {
  RATING_DIMENSION_GROUPS,
  RATING_DIMENSIONS,
  type PartialRatingDimensions,
  type RatingDimensionKey,
} from '@/src/features/ratings/dimensions';
import {
  getRatingErrorMessage,
  RATING_USER_MESSAGES,
  type RatingError,
} from '@/src/features/ratings/errors';
import { useSubmitRatingMutation } from '@/src/features/ratings/mutations';
import { useUserRatingQuery } from '@/src/features/ratings/queries';
import {
  PRIVATE_NOTE_MAX_LENGTH,
  type MyRating,
} from '@/src/features/ratings/types';
import {
  computeCompositeScore100,
  emptyPartialDimensions,
  isCompleteDimensionSet,
} from '@/src/features/ratings/score';
import { assertCompleteDimensions } from '@/src/features/ratings/validation';
import { useProductQuery } from '@/src/features/products/queries';

function dimensionsFromRating(rating: MyRating): PartialRatingDimensions {
  return {
    look: rating.look,
    outfit: rating.outfit,
    material: rating.material,
    craftsmanship: rating.craftsmanship,
    maintenance: rating.maintenance,
    comfort: rating.comfort,
    collection: rating.collection,
    value: rating.value,
    resalePotential: rating.resalePotential,
    acquisitionEase: rating.acquisitionEase,
  };
}

type RateFormProps = {
  productId: string;
  userId: string;
  productName?: string;
  isEdit: boolean;
  initialDimensions: PartialRatingDimensions;
  initialPrivateNote: string;
  isOffline: boolean;
};

/** Keep the standard edge Back gesture without iOS 26 full-screen dismissal. */
function RateStackScreen({ title }: { title: string }) {
  return (
    <Stack.Screen
      options={{
        title,
        gestureEnabled: true,
        fullScreenGestureEnabled: false,
        headerLeft: ({ canGoBack }) => (
          <HeaderBackButton canGoBack={canGoBack} />
        ),
      }}
    />
  );
}

/**
 * Controlled form isolated so parent can remount with a new key when the
 * owner rating query settles (create empty / edit prefilled).
 */
function RateForm({
  productId,
  userId,
  productName,
  isEdit,
  initialDimensions,
  initialPrivateNote,
  isOffline,
}: RateFormProps) {
  const router = useRouter();
  const submitMutation = useSubmitRatingMutation();
  const [dimensions, setDimensions] =
    useState<PartialRatingDimensions>(initialDimensions);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<RatingDimensionKey | 'privateNote', string>>
  >({});
  const [privateNote, setPrivateNote] = useState(initialPrivateNote);
  const [formError, setFormError] = useState<string | null>(null);

  // Active in-flight network work only — paused mutations must not spin forever.
  const saving =
    submitMutation.isPending && !submitMutation.isPaused;
  const privateNoteLength = privateNote.length;
  const noteOverLimit = privateNoteLength > PRIVATE_NOTE_MAX_LENGTH;
  const score100 = computeCompositeScore100(dimensions);
  const allComplete = isCompleteDimensionSet(dimensions);
  const canSubmit = useMemo(
    () => !saving && !noteOverLimit,
    [noteOverLimit, saving],
  );

  const updateDimension = (key: RatingDimensionKey, value: number | null) => {
    setDimensions((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setFormError(null);
  };

  const validate = (): PartialRatingDimensions | null => {
    const nextErrors: Partial<
      Record<RatingDimensionKey | 'privateNote', string>
    > = {};

    let incompleteCount = 0;
    for (const dim of RATING_DIMENSIONS) {
      if (dimensions[dim.key] == null) {
        incompleteCount += 1;
        nextErrors[dim.key] = RATING_USER_MESSAGES.scoreIncomplete;
      }
    }

    if (noteOverLimit) {
      nextErrors.privateNote = RATING_USER_MESSAGES.privateNoteTooLong;
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      // Sticky footer: incomplete rows may be scrolled out of view.
      if (incompleteCount > 0) {
        setFormError(
          incompleteCount === 1
            ? '1 category still needs a score before you can save.'
            : `${incompleteCount} categories still need a score before you can save.`,
        );
      } else if (nextErrors.privateNote) {
        setFormError(RATING_USER_MESSAGES.privateNoteTooLong);
      } else {
        setFormError(RATING_USER_MESSAGES.validation);
      }
      return null;
    }

    try {
      assertCompleteDimensions(dimensions);
    } catch {
      setFormError(RATING_USER_MESSAGES.validation);
      return null;
    }

    return dimensions;
  };

  const onSubmit = async () => {
    if (saving) {
      return;
    }
    setFormError(null);

    if (isOffline) {
      setFormError(RATING_USER_MESSAGES.offline);
      return;
    }

    const parsed = validate();
    if (!parsed || !isCompleteDimensionSet(parsed)) {
      return;
    }

    try {
      await submitMutation.mutateAsync({
        productId,
        userId,
        ...parsed,
        privateNote: privateNote.length === 0 ? null : privateNote,
      });
      router.dismissTo(`/product/${productId}` as never);
    } catch (error) {
      // Domain error only; form state is intentionally preserved.
      setFormError(getRatingErrorMessage(error));
    }
  };

  const title = isEdit ? 'Edit rating' : 'Rate';

  return (
    <Screen
      scroll
      footer={
        <View className="border-t border-border bg-background px-4 py-3">
          {isOffline ? (
            <AppText
              testID="rate-offline-banner"
              variant="caption"
              className="mb-2 text-center text-warning"
              accessibilityRole="text">
              You&apos;re offline. Connect to save this rating.
            </AppText>
          ) : null}
          {formError ? (
            <AppText
              testID="rate-form-error"
              variant="caption"
              className="mb-2 text-center text-accent"
              accessibilityRole="alert">
              {formError}
            </AppText>
          ) : null}
          <Button
            testID="rate-submit"
            label={
              saving ? 'Saving...' : isEdit ? 'Save changes' : 'Save rating'
            }
            loading={saving}
            disabled={!canSubmit}
            onPress={() => {
              void onSubmit();
            }}
          />
        </View>
      }>
      <RateStackScreen title={title} />

      <View className="mt-2">
        {productName ? (
          <AppText variant="subtitle" testID="rate-product-name">
            {productName}
          </AppText>
        ) : null}
        <AppText variant="caption" className="mt-1">
          Rate each category from 0 to 10 (half steps). My Rating is calculated
          automatically on a 0–100 scale. Private notes stay owner-only.
        </AppText>
      </View>

      <View
        testID="rate-my-rating-preview"
        className="mt-5 rounded-card border border-border bg-card px-4 py-3">
        <AppText variant="label">My Rating</AppText>
        <AppText className="mt-1 text-2xl font-semibold text-primary">
          {score100 == null ? '— / 100' : `${score100} / 100`}
        </AppText>
        <AppText variant="caption" className="mt-1">
          {allComplete
            ? 'Derived evenly from all ten categories.'
            : 'Complete every category to calculate My Rating.'}
        </AppText>
      </View>

      {RATING_DIMENSION_GROUPS.map((group) => (
        <View key={group.id} className="mt-6">
          <AppText variant="label">{group.label}</AppText>
          <View className="mt-3 gap-4">
            {RATING_DIMENSIONS.filter((d) => d.groupId === group.id).map(
              (dim) => (
                <DimensionStepperRow
                  key={dim.key}
                  testID={`rate-dim-${dim.key}`}
                  label={dim.label}
                  description={dim.description}
                  value={dimensions[dim.key]}
                  error={fieldErrors[dim.key]}
                  onChange={(value) => updateDimension(dim.key, value)}
                />
              ),
            )}
          </View>
        </View>
      ))}

      <View className="mt-6">
        <AppText variant="label">Private note</AppText>
        <AppText variant="caption" className="mt-1">
          Optional. Only you can see this note — it is not a public review.
        </AppText>
        <Input
          testID="rate-private-note"
          className="mt-2 min-h-28 py-3"
          value={privateNote}
          onChangeText={(value) => {
            setPrivateNote(value.slice(0, PRIVATE_NOTE_MAX_LENGTH));
            setFieldErrors((prev) => {
              if (!prev.privateNote) {
                return prev;
              }
              const next = { ...prev };
              delete next.privateNote;
              return next;
            });
            setFormError(null);
          }}
          multiline
          textAlignVertical="top"
          maxLength={PRIVATE_NOTE_MAX_LENGTH}
          placeholder="Optional notes for yourself"
          accessibilityLabel="Private note"
          invalid={Boolean(fieldErrors.privateNote)}
          errorMessage={fieldErrors.privateNote}
        />
        <AppText
          testID="rate-private-note-count"
          variant="caption"
          className="mt-1.5">
          {privateNoteLength}/{PRIVATE_NOTE_MAX_LENGTH}
        </AppText>
        {fieldErrors.privateNote ? (
          <AppText variant="caption" className="mt-1 text-negative">
            {fieldErrors.privateNote}
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}

/**
 * Durable Rate / Edit form (Task 17).
 * Signed-out users still hit the Task 16 gate → Sign in with product return path.
 */
export default function RateProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = typeof id === 'string' ? id : '';
  const { status, isSignedIn, user } = useAuth();
  const productQuery = useProductQuery(productId);
  const ratingQuery = useUserRatingQuery(productId);
  const offline = productQuery.isOffline || ratingQuery.isOffline;

  useEffect(() => {
    if (status === 'initializing') {
      return;
    }
    if (!isSignedIn && productId) {
      router.replace({
        pathname: '/auth/sign-in',
        params: { returnTo: productDetailReturnPath(productId) },
      });
    }
  }, [isSignedIn, productId, router, status]);

  if (status === 'initializing' || (!isSignedIn && productId)) {
    return (
      <Screen>
        <RateStackScreen title="Rate" />
        <LoadingState message="Checking account..." />
      </Screen>
    );
  }

  if (!productId) {
    return (
      <Screen>
        <RateStackScreen title="Rate" />
        <EmptyState
          title="Product not found"
          message="This product is not publicly available."
        />
      </Screen>
    );
  }

  if (productQuery.isPending && productQuery.fetchStatus === 'paused' && !productQuery.data) {
    return (
      <Screen>
        <RateStackScreen title="Rate" />
        <ErrorState
          title="You're offline."
          message="Connect to the internet and try again."
          onRetry={() => {
            void productQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  if (productQuery.isPending && !productQuery.data) {
    return (
      <Screen>
        <RateStackScreen title="Rate" />
        <LoadingState message="Loading product..." />
      </Screen>
    );
  }

  if (productQuery.error && !productQuery.data) {
    return (
      <Screen>
        <RateStackScreen title="Rate" />
        <ErrorState
          title="Could not load product"
          message="Connect to the internet and try again."
          onRetry={() => {
            void productQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  // Offline + no cached owner rating: never infinite LoadingState.
  if (
    ratingQuery.isPending &&
    ratingQuery.fetchStatus === 'paused' &&
    ratingQuery.data === undefined
  ) {
    return (
      <Screen>
        <RateStackScreen title="Rate" />
        <ErrorState
          title="You're offline."
          message="Connect to load your existing rating, or reconnect and try again."
          onRetry={() => {
            void ratingQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  if (ratingQuery.isPending && ratingQuery.data === undefined) {
    return (
      <Screen>
        <RateStackScreen title="Rate" />
        <LoadingState message="Loading your rating..." />
      </Screen>
    );
  }

  if (ratingQuery.isError && ratingQuery.data === undefined) {
    const code = (ratingQuery.error as RatingError | null)?.code;
    return (
      <Screen>
        <RateStackScreen title="Rate" />
        <ErrorState
          title={
            code === 'offline' ? "You're offline." : 'Could not load your rating'
          }
          message={getRatingErrorMessage(ratingQuery.error)}
          onRetry={() => {
            void ratingQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  const existing: MyRating | null = ratingQuery.data ?? null;
  // Remount only when the owner/product identity changes. Do NOT key on
  // dataUpdatedAt — reconnect/refocus refetches would wipe in-progress
  // dimensions and the private note (Task 17 preserve-form contract).
  const formKey = `${user!.id}:${productId}`;

  return (
    <RateForm
      key={formKey}
      productId={productId}
      userId={user!.id}
      productName={productQuery.data?.product.name}
      isEdit={existing != null}
      initialDimensions={
        existing ? dimensionsFromRating(existing) : emptyPartialDimensions()
      }
      initialPrivateNote={existing?.privateNote ?? ''}
      isOffline={offline}
    />
  );
}
