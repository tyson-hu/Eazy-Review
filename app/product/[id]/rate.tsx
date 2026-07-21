import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { HeaderBackButton } from '@/src/components/ui/HeaderBackButton';
import { Input } from '@/src/components/ui/Input';
import { RatingInputRow } from '@/src/components/ui/RatingInputRow';
import { Screen } from '@/src/components/ui/Screen';
import {
  getMockProductDetailById,
  saveMockMyRating,
} from '@/src/features/products/mockProductDetails';
import type { RatingBreakdown } from '@/src/types/product';

const SCORE_FIELDS = [
  { key: 'overall', label: 'Overall' },
  { key: 'look', label: 'Look' },
  { key: 'comfort', label: 'Comfort' },
  { key: 'quality', label: 'Quality' },
  { key: 'outfit', label: 'Outfit' },
  { key: 'value', label: 'Value' },
] as const;

type ScoreFieldKey = (typeof SCORE_FIELDS)[number]['key'];

type ScoreDrafts = Record<ScoreFieldKey, string>;
type ScoreErrors = Partial<Record<ScoreFieldKey, string>>;

function initialScoreDrafts(myRating: RatingBreakdown | null): ScoreDrafts {
  if (!myRating) {
    return {
      look: '',
      comfort: '',
      quality: '',
      outfit: '',
      value: '',
      overall: '',
    };
  }

  return {
    look: String(myRating.look),
    comfort: String(myRating.comfort),
    quality: String(myRating.quality),
    outfit: String(myRating.outfit),
    value: String(myRating.value),
    overall: String(myRating.overall),
  };
}

/** Validates a draft score string. Returns an error message or undefined when valid. */
function validateScoreField(raw: string): string | undefined {
  const trimmed = raw.trim();

  if (trimmed === '') {
    return 'This field is required.';
  }

  if (!/^\d+$/.test(trimmed)) {
    if (trimmed.includes('.')) {
      return 'Enter a whole number from 1 to 10.';
    }
    return 'Enter a valid number.';
  }

  const value = Number(trimmed);
  if (value < 1 || value > 10) {
    return 'Must be between 1 and 10.';
  }

  return undefined;
}

function validateAllScores(drafts: ScoreDrafts): ScoreErrors {
  const errors: ScoreErrors = {};
  for (const { key } of SCORE_FIELDS) {
    const error = validateScoreField(drafts[key]);
    if (error) {
      errors[key] = error;
    }
  }
  return errors;
}

function buildRatingFromDrafts(
  drafts: ScoreDrafts,
  commentDraft: string,
): RatingBreakdown {
  // Comment empty→null normalization lives only in saveMockMyRating.
  return {
    look: Number(drafts.look.trim()),
    comfort: Number(drafts.comfort.trim()),
    quality: Number(drafts.quality.trim()),
    outfit: Number(drafts.outfit.trim()),
    value: Number(drafts.value.trim()),
    overall: Number(drafts.overall.trim()),
    comment: commentDraft,
  };
}

export default function RateProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = typeof id === 'string' ? getMockProductDetailById(id) : null;

  if (!detail) {
    return (
      <Screen>
        <Stack.Screen
          options={{
            title: 'Rate',
            headerLeft: ({ canGoBack }) => <HeaderBackButton canGoBack={canGoBack} />,
          }}
        />
        <EmptyState title="Product not found" message="This product is not in the catalog." />
      </Screen>
    );
  }

  return <RateProductForm key={detail.product.id} detail={detail} />;
}

type RateProductFormProps = {
  detail: NonNullable<ReturnType<typeof getMockProductDetailById>>;
};

function RateProductForm({ detail }: RateProductFormProps) {
  const router = useRouter();
  const { product, myRating } = detail;
  const isEditing = myRating != null;

  const [scores, setScores] = useState<ScoreDrafts>(() => initialScoreDrafts(myRating));
  const [comment, setComment] = useState(() => myRating?.comment ?? '');
  const [errors, setErrors] = useState<ScoreErrors>({});

  const updateScore = (key: ScoreFieldKey, value: string) => {
    setScores((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (prev[key] == null) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = () => {
    const nextErrors = validateAllScores(scores);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const rating = buildRatingFromDrafts(scores, comment);
    // Form only mounts when getMockProductDetailById succeeded for this id, so
    // save uses the same existence rules and is expected to succeed. Keep the
    // boolean for non-UI callers of saveMockMyRating; ignore it here.
    saveMockMyRating(product.id, rating);

    const successTitle = 'Saved for this session';
    const successBody =
      'Your My Rating was updated in this app session only. It is not saved to a server and will reset if you reload the app.';
    const goToDetail = () => {
      router.dismissTo(`/product/${product.id}`);
    };

    if (Platform.OS === 'web') {
      // RN Alert onPress does not run on web; alert then navigate so Detail is restored.
      window.alert(`${successTitle}\n\n${successBody}`);
      goToDetail();
      return;
    }

    Alert.alert(
      successTitle,
      successBody,
      [{ text: 'OK', onPress: goToDetail }],
      { cancelable: false },
    );
  };

  return (
    <Screen scroll contentClassName="pb-24">
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit rating' : 'Rate',
          headerLeft: ({ canGoBack }) => <HeaderBackButton canGoBack={canGoBack} />,
        }}
      />

      <View className="mt-4">
        <AppText variant="label">{product.brand}</AppText>
        <AppText variant="title" className="mt-1">
          {product.name}
        </AppText>
      </View>

      <Card className="mt-5 gap-5">
        {SCORE_FIELDS.map(({ key, label }) => (
          <RatingInputRow
            key={key}
            label={label}
            value={scores[key]}
            onChangeText={(value) => updateScore(key, value)}
            error={errors[key]}
            emphasized={key === 'overall'}
          />
        ))}

        <View>
          <AppText variant="label">Comment</AppText>
          <Input
            className="mt-2 min-h-24 py-3"
            value={comment}
            onChangeText={setComment}
            placeholder="Optional"
            multiline
            textAlignVertical="top"
            accessibilityLabel="Comment"
          />
        </View>
      </Card>

      <Button
        className="mt-6"
        label={isEditing ? 'Save rating' : 'Submit rating'}
        onPress={handleSubmit}
      />
    </Screen>
  );
}
