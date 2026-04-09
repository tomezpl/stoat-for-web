import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { AudioTrack, useTracks } from "solid-livekit-components";

import { getTrackReferenceId, isLocal } from "@livekit/components-core";
import { Key } from "@solid-primitives/keyed";
import { RemoteTrackPublication, Track } from "livekit-client";

import { useState } from "@revolt/state";

import { useVoice } from "../state";
import joinSound from '../../../test_assets/join_sound.ogg';

export function RoomAudioManager() {
  const voice = useVoice();
  const state = useState();

  const tracks = useTracks(
    [
      Track.Source.Microphone,
      Track.Source.ScreenShareAudio,
      Track.Source.Unknown,
    ],
    {
      updateOnlyOn: [],
      onlySubscribed: false,
    },
  );

  const filteredTracks = createMemo(() =>
    tracks().filter(
      (track) =>
        !isLocal(track.participant) &&
        track.publication.kind === Track.Kind.Audio,
    ),
  );

  createEffect(() => {
    const tracks = filteredTracks();
    console.info("[rtc] filtered tracks", filteredTracks());
    for (const track of tracks) {
      (track.publication as RemoteTrackPublication).setSubscribed(true);
      console.info(track.publication);
    }
  });

  const [trackCount, setTrackCount] = createSignal(0);
  const [canDetectJoin, setCanDetectJoin] = createSignal(false);

  createEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    if(tracks().length) {
      timeout = setTimeout(() => {
        setCanDetectJoin(true);
        timeout = undefined;
      }, 500);
    } else {
      setCanDetectJoin(false);
    }

    onCleanup(() => {
      if(timeout !== undefined) {
        clearTimeout(timeout);
        timeout = undefined;
      }
    })
  })

  createEffect(() => {
    const newTrackCount = filteredTracks().length;

    if(canDetectJoin()) {
      if(trackCount() < newTrackCount) {
        console.log('someone joined! track count changed from', trackCount(), 'to', newTrackCount);

        if(joinAudioEl) {
          joinAudioEl.volume = 0.2;
          joinAudioEl.play();
        }
      }
    }

    setTrackCount(newTrackCount);

  })

  let joinAudioEl: HTMLAudioElement | undefined;

  return (
    <div style={{ display: "none" }}>
      <audio src={joinSound} autoplay={false} controls={false} preload={'auto'} ref={joinAudioEl} style={{display: 'none'}} />
      <Key each={filteredTracks()} by={(item) => getTrackReferenceId(item)}>
        {(track) => (
          <AudioTrack
            trackRef={track()}
            volume={
              state.voice.outputVolume *
              state.voice.getUserVolume(track().participant.identity)
            }
            muted={
              state.voice.getUserMuted(track().participant.identity) ||
              voice.deafen()
            }
            enableBoosting
          />
        )}
      </Key>
    </div>
  );
}
