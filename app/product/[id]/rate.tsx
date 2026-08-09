import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { HeaderBackButton } from '@/src/components/ui/HeaderBackButton';
import { Input } from '@/src/components/ui/Input';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { RatingInputRow } from '@/src/components/ui/RatingInputRow';
import { Screen } from '@/src/components/ui/Screen';
import { useAuth } from '@/src/features/auth/hooks';
import { productDetailReturnPath } from '@/src/features/auth/returnPath';
import {
  getRatingErrorMessage,
  RATING_USER_MESSAGES,
} from '@/src/features/ratings/errors';
import { useSubmitRatingMutation } from '@/src/features/ratings/mutations';
import { useUserRatingQuery } from '@/src/features/ratings/queries';
import {
  PRIVATE_NOTE_MAX_LENGTH,
  type MyRating,
  type RatingScoreFields,
} from '@/src/features/ratings/types';
import { parseRatingScore } from '@/src/features/ratings/validation';
import { useProductQuery } from '@/src/features/products/queries';

type ScoreField = keyof RatingScoreFields;

const SCORE_FIELDS: { key: ScoreField; label: string; emphasized?: boolean }[] =
  [
    { key: 'overall', label: 'Overall', emphasized: true },
    { key: 'look', label: 'Look' },
    { key: 'comfort', label: 'Comfort' },
    { key: 'quality', label: 'Quality' },
    { key: 'outfit', label: 'Outfit' },
    { key: 'value', label: 'Value' },
  ];

type FormScores = Record<ScoreField, string>;

const EMPTY_SCORES: FormScores = {
  look: '',
  comfort: '',
  quality: '',
  outfit: '',
  value: '',
  overall: '',
};

function scoresFromRating(rating: RatingScoreFields): FormScores {
  return {
    look: String(rating.look),
    comfort: String(rating.comfort),
    quality: String(rating.quality),
    outfit: String(rating.outfit),
    value: String(rating.value),
    overall: String(rating.overall),
  };
}

type RateFormProps = {
  productId: string;
  userId: string;
  productName?: string;
  isEdit: boolean;
  initialScores: FormScores;
  initialPrivateNote: string;
};

/**
 * Controlled form isolated so parent can remount with a new key when the
 * owner rating query settles (create empty / edit prefilled).
 */
function RateForm({
  productId,
  userId,
  productName,
  isEdit,
  initialScores,
  initialPrivateNote,
}: RateFormProps) {
  const router = useRouter();
  const submitMutation = useSubmitRatingMutation();
  const [scores, setScores] = useState<FormScores>(initialScores);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ScoreField | 'privateNote', string>>
  >({});
  const [privateNote, setPrivateNote] = useState(initialPrivateNote);
  const [formError, setFormError] = useState<string | null>(null);

  const saving = submitMutation.isPending;
  const privateNoteLength = privateNote.length;
  const noteOverLimit = privateNoteLength > PRIVATE_NOTE_MAX_LENGTH;
  const canSubmit = useMemo(() => !saving && !noteOverLimit, [noteOverLimit, saving]);

  const updateScore = (key: ScoreField, value: string) => {
    setScores((prev) => ({ ...prev, [key]: value }));
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

  const validate = (): RatingScoreFields | null => {
    const nextErrors: Partial<Record<ScoreField | 'privateNote', string>> = {};
    const parsed: Partial<Record<ScoreField, number>> = {};

    for (const field of SCORE_FIELDS) {
      const value = parseRatingScore(scores[field.key]);
      if (value == null) {
        nextErrors[field.key] = RATING_USER_MESSAGES.scoreInvalid;
      } else {
        parsed[field.key] = value;
      }
    }

    if (noteOverLimit) {
      nextErrors.privateNote = RATING_USER_MESSAGES.privateNoteTooLong;
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return null;
    }

    return {
      look: parsed.look!,
      comfort: parsed.comfort!,
      quality: parsed.quality!,
      outfit: parsed.outfit!,
      value: parsed.value!,
      overall: parsed.overall!,
    };
  };

  const onSubmit = async () => {
    if (saving) {
      return;
    }
    setFormError(null);
    const parsed = validate();
    if (!parsed) {
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
      setFormError(getRatingErrorMessage(error));
    }
  };

  const title = isEdit ? 'Edit rating' : 'Rate';

  return (
    <Screen
      scroll
      footer={
        <View className="border-t border-border bg-background px-4 py-3">
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
            label={saving ? 'Saving...' : isEdit ? 'Save changes' : 'Save rating'}
            loading={saving}
            disabled={!canSubmit}
            onPress={() => {
              void onSubmit();
            }}
          />
        </View>
      }>
      <Stack.Screen
        options={{
          title,
          headerLeft: ({ canGoBack }) => (
            <HeaderBackButton canGoBack={canGoBack} />
          ),
        }}
      />

      <View className="mt-2">
        {productName ? (
          <AppText variant="subtitle" testID="rate-product-name">
            {productName}
          </AppText>
        ) : null}
        <AppText variant="caption" className="mt-1">
          Rate each category from 1 to 10. Only you can see your private note.
        </AppText>
      </View>

      <View className="mt-6 gap-5">
        {SCORE_FIELDS.map((field) => (
          <RatingInputRow
            key={field.key}
            label={field.label}
            value={scores[field.key]}
            onChangeText={(value) => updateScore(field.key, value)}
            error={fieldErrors[field.key]}
            emphasized={field.emphasized}
          />
        ))}
      </View>

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
        <Stack.Screen
          options={{
            title: 'Rate',
            headerLeft: ({ canGoBack }) => (
              <HeaderBackButton canGoBack={canGoBack} />
            ),
          }}
        />
        <LoadingState message="Checking account..." />
      </Screen>
    );
  }

  if (!productId) {
    return (
      <Screen>
        <Stack.Screen
          options={{
            title: 'Rate',
            headerLeft: ({ canGoBack }) => (
              <HeaderBackButton canGoBack={canGoBack} />
            ),
          }}
        />
        <EmptyState
          title="Product not found"
          message="This product is not publicly available."
        />
      </Screen>
    );
  }

  if (productQuery.isPending && !productQuery.data) {
    return (
      <Screen>
        <Stack.Screen
          options={{
            title: 'Rate',
            headerLeft: ({ canGoBack }) => (
              <HeaderBackButton canGoBack={canGoBack} />
            ),
          }}
        />
        <LoadingState message="Loading product..." />
      </Screen>
    );
  }

  if (productQuery.error && !productQuery.data) {
    return (
      <Screen>
        <Stack.Screen
          options={{
            title: 'Rate',
            headerLeft: ({ canGoBack }) => (
              <HeaderBackButton canGoBack={canGoBack} />
            ),
          }}
        />
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

  if (ratingQuery.isPending) {
    return (
      <Screen>
        <Stack.Screen
          options={{
            title: 'Rate',
            headerLeft: ({ canGoBack }) => (
              <HeaderBackButton canGoBack={canGoBack} />
            ),
          }}
        />
        <LoadingState message="Loading your rating..." />
      </Screen>
    );
  }

  if (ratingQuery.isError) {
    return (
      <Screen>
        <Stack.Screen
          options={{
            title: 'Rate',
            headerLeft: ({ canGoBack }) => (
              <HeaderBackButton canGoBack={canGoBack} />
            ),
          }}
        />
        <ErrorState
          title="Could not load your rating"
          message={getRatingErrorMessage(ratingQuery.error)}
          onRetry={() => {
            void ratingQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  const existing: MyRating | null = ratingQuery.data ?? null;
  const formKey = `${user?.id ?? ''}:${productId}:${ratingQuery.dataUpdatedAt}:${
    existing ? 'edit' : 'new'
  }`;

  return (
    <RateForm
      key={formKey}
      productId={productId}
      userId={user!.id}
      productName={productQuery.data?.product.name}
      isEdit={existing != null}
      initialScores={existing ? scoresFromRating(existing) : EMPTY_SCORES}
      initialPrivateNote={existing?.privateNote ?? ''}
    />
  );
}
