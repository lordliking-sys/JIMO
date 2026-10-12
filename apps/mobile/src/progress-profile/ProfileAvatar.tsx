import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Camera from 'lucide-react-native/icons/camera';
import { useLocalAvatar } from './useLocalAvatar';
import { EditorialText, Copy, PaperCard } from './Surface';
import { Action } from './Controls';
import { monogram } from './chart';
import { ink } from './theme';

export function ProfileAvatar({ name }: { name: string | null }) {
  const avatar = useLocalAvatar(),
    { t } = useTranslation('progressProfile'),
    insets = useSafeAreaInsets();
  return (
    <>
      <Pressable
        testID="profile-avatar"
        accessibilityRole="button"
        accessibilityLabel={t('avatarActions.title')}
        accessibilityHint={t('avatarActions.localOnly')}
        accessibilityState={{ disabled: avatar.disabled, busy: avatar.busy }}
        disabled={avatar.disabled}
        onPress={avatar.show}
        style={({ pressed }) => ({
          width: 84,
          height: 84,
          marginBottom: 4,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: 42,
            borderWidth: 2,
            borderColor: ink.paper,
            backgroundColor: 'rgba(12, 20, 14, 0.65)',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {avatar.uri ? (
            <Image
              key={avatar.uri}
              testID="profile-avatar-photo"
              source={{ uri: avatar.uri }}
              resizeMode="cover"
              accessible={false}
              onError={() => avatar.unavailable(avatar.uri!)}
              style={{ width: '100%', height: '100%', borderRadius: 40 }}
            />
          ) : (
            <EditorialText
              testID="profile-avatar-monogram"
              accessible={false}
              style={{ color: ink.paper, fontSize: 42 }}
            >
              {monogram(name)}
            </EditorialText>
          )}
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: -2,
            bottom: 0,
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: ink.paper,
            backgroundColor: ink.green,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Camera size={13} color={ink.paper} accessible={false} />
        </View>
      </Pressable>
      {avatar.error && !avatar.open ? (
        <Copy
          accessibilityRole="alert"
          style={{ color: ink.paper, textAlign: 'center' }}
        >
          {t(`avatarActions.errors.${avatar.error}`)}
        </Copy>
      ) : null}
      <Modal
        visible={avatar.open}
        transparent
        animationType="none"
        onRequestClose={avatar.close}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            paddingLeft: insets.left + 24,
            paddingRight: insets.right + 24,
            backgroundColor: 'rgba(8, 13, 9, 0.85)',
          }}
        >
          <PaperCard
            accessibilityViewIsModal
            style={{
              maxHeight: '100%',
              maxWidth: 480,
              width: '100%',
              alignSelf: 'center',
            }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 12 }}
            >
              <EditorialText accessibilityRole="header">
                {t('avatarActions.title')}
              </EditorialText>
              <Copy>{t('avatarActions.localOnly')}</Copy>
              {avatar.error ? (
                <Copy accessibilityRole="alert" style={{ color: ink.danger }}>
                  {t(`avatarActions.errors.${avatar.error}`)}
                </Copy>
              ) : null}
              <Action
                label={t('avatarActions.camera')}
                disabled={avatar.busy}
                onPress={() => avatar.choose('camera')}
              />
              <Action
                label={t('avatarActions.gallery')}
                disabled={avatar.busy}
                onPress={() => avatar.choose('gallery')}
              />
              {avatar.uri ? (
                <Action
                  label={t('avatarActions.remove')}
                  disabled={avatar.busy}
                  onPress={avatar.remove}
                />
              ) : null}
              <Action
                label={t('avatarActions.cancel')}
                disabled={avatar.busy}
                onPress={avatar.close}
              />
            </ScrollView>
          </PaperCard>
        </View>
      </Modal>
    </>
  );
}
