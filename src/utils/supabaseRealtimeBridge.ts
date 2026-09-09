import { RoomState } from '../types';
import { supabase } from '../lib/supabase';
import { localGameEngine } from './localGameEngine';

export interface SupabaseRealtimeBridgeCallbacks {
  onStateUpdate: (state: RoomState) => void;
  onEvent?: (event: { type: string; message: string }) => void;
  onPeerJoin?: (playerId: string) => void;
  onPeerLeave?: (playerId: string) => void;
}

export class SupabaseRealtimeBridge {
  private channel: any = null;
  private roomId: string = '';
  private playerId: string = '';
  private isHost: boolean = false;
  private callbacks: SupabaseRealtimeBridgeCallbacks | null = null;
  private engineUnsub: (() => void) | null = null;

  public initRoom(
    roomId: string,
    playerId: string,
    isHost: boolean,
    callbacks: SupabaseRealtimeBridgeCallbacks,
    profile?: { name: string; chips: number; wins: number; avatarUrl?: string }
  ) {
    this.leaveRoom();

    this.roomId = roomId.toUpperCase().trim();
    this.playerId = playerId;
    this.isHost = isHost;
    this.callbacks = callbacks;

    const channelName = `blackjack_room_${this.roomId}`;

    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: this.playerId }
      }
    });

    // Listen for room state broadcasts from the host
    this.channel.on('broadcast', { event: 'room_state' }, ({ payload }: { payload: RoomState }) => {
      if (!this.isHost && payload) {
        this.callbacks?.onStateUpdate(payload);
      }
    });

    // Listen for events (sound effects, dealer announcements)
    this.channel.on('broadcast', { event: 'game_event' }, ({ payload }: { payload: { type: string; message: string } }) => {
      if (!this.isHost && payload) {
        this.callbacks?.onEvent?.(payload);
      }
    });

    // If host: listen for guest joins, state requests, and player actions
    this.channel.on('broadcast', { event: 'player_join' }, ({ payload }: { payload: any }) => {
      if (this.isHost && payload) {
        localGameEngine.joinPlayer(payload);
      }
    });

    this.channel.on('broadcast', { event: 'request_state' }, () => {
      if (this.isHost) {
        const currentState = localGameEngine.getState();
        this.channel?.send({
          type: 'broadcast',
          event: 'room_state',
          payload: currentState
        });
      }
    });

    this.channel.on('broadcast', { event: 'player_action' }, ({ payload }: { payload: { action: string; playerId: string; payload?: any } }) => {
      if (this.isHost && payload) {
        localGameEngine.handleRemoteAction(payload.action, payload.playerId, payload.payload);
      }
    });

    this.channel.on('broadcast', { event: 'player_leave' }, ({ payload }: { payload: { playerId: string } }) => {
      if (this.isHost && payload?.playerId) {
        localGameEngine.leavePlayer(payload.playerId);
      }
    });

    this.channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        this.channel.track({
          id: this.playerId,
          isHost: this.isHost,
          joinedAt: Date.now()
        });

        // If guest, announce arrival to the host with accurate profile
        if (!this.isHost) {
          const guestName = profile?.name || localStorage.getItem('blackjack_player_name') || 'Jogador Convidado';
          const guestChips = profile?.chips ?? parseInt(localStorage.getItem('blackjack_guest_chips') || '1000', 10);
          const guestWins = profile?.wins ?? parseInt(localStorage.getItem('blackjack_guest_wins') || '0', 10);
          const guestAvatar = profile?.avatarUrl ?? (localStorage.getItem('blackjack_player_avatar') || '');

          this.channel.send({
            type: 'broadcast',
            event: 'player_join',
            payload: {
              id: this.playerId,
              name: guestName,
              chips: guestChips,
              wins: guestWins,
              avatarUrl: guestAvatar
            }
          });

          this.channel.send({
            type: 'broadcast',
            event: 'request_state'
          });
        }
      }
    });

    // If host, subscribe to localGameEngine and broadcast every change
    if (this.isHost) {
      this.engineUnsub = localGameEngine.subscribe({
        onState: (state) => {
          this.callbacks?.onStateUpdate(state);
          if (this.channel) {
            this.channel.send({
              type: 'broadcast',
              event: 'room_state',
              payload: state
            });
          }
        },
        onEvent: (event) => {
          this.callbacks?.onEvent?.(event);
          if (this.channel) {
            this.channel.send({
              type: 'broadcast',
              event: 'game_event',
              payload: event
            });
          }
        }
      });
    }
  }

  public sendAction(action: string, payload?: any) {
    if (this.isHost) {
      localGameEngine.handleRemoteAction(action, this.playerId, payload);
    } else if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'player_action',
        payload: {
          action,
          playerId: this.playerId,
          payload
        }
      });
    }
  }

  public leaveRoom() {
    if (this.engineUnsub) {
      this.engineUnsub();
      this.engineUnsub = null;
    }

    if (this.channel) {
      if (!this.isHost) {
        this.channel.send({
          type: 'broadcast',
          event: 'player_leave',
          payload: { playerId: this.playerId }
        });
      }
      this.channel.unsubscribe();
      this.channel = null;
    }

    this.roomId = '';
    this.isHost = false;
  }
}

export const realtimeBridge = new SupabaseRealtimeBridge();
