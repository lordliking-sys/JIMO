import { Image, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { JimoDialog, PopupButton } from '../components/JimoDialog';
import Camera from 'lucide-react-native/icons/camera';
import { useLocalAvatar } from './useLocalAvatar';
import { EditorialText, Copy } from './Surface';
import { monogram } from './chart';
import { ink } from './theme';

export function ProfileAvatar({ name }: { name: string | null }) {
  const avatar = useLocalAvatar(),
    { t } = useTranslation('progressProfile');
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
            borderColor: ink.green,
            backgroundColor: ink.card,
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
              style={{ color: ink.green, fontSize: 32 }}
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
            borderColor: ink.green,
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
          style={{ color: ink.danger, textAlign: 'center' }}
        >
          {t(`avatarActions.errors.${avatar.error}`)}
        </Copy>
      ) : null}
      {avatar.open ? (
        <JimoDialog
          title={t('avatarActions.title')}
          visible={avatar.open}
          close={avatar.close}
          onDismiss={() => {}}
          busy={avatar.busy}
          footer={
            <PopupButton
              label={t('avatarActions.cancel')}
              outline
              disabled={avatar.busy}
              onPress={avatar.close}
            />
          }
        >
          <Copy>{t('avatarActions.localOnly')}</Copy>
          {avatar.error ? (
            <Copy accessibilityRole="alert" style={{ color: ink.danger }}>
              {t(`avatarActions.errors.${avatar.error}`)}
            </Copy>
          ) : null}
          <PopupButton
            label={t('avatarActions.camera')}
            disabled={avatar.busy}
            onPress={() => avatar.choose('camera')}
          />
          <PopupButton
            label={t('avatarActions.gallery')}
            outline
            disabled={avatar.busy}
            onPress={() => avatar.choose('gallery')}
          />
          {avatar.uri ? (
            <PopupButton
              label={t('avatarActions.remove')}
              outline
              disabled={avatar.busy}
              onPress={avatar.remove}
            />
          ) : null}
        </JimoDialog>
      ) : null}
    </>
  );
}
