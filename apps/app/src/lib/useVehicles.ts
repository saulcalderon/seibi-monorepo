import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthSession } from './authSession'
import {
  createVehicle,
  listVehicles,
  updateVehicleIdentity,
  vehiclesQueryKey,
  withdrawVehicle,
  type VehicleCreateInput,
  type VehicleIdentityInput,
} from './vehicles'
import { getActiveVehicle, type VehicleProfile } from './vehicleProfile'

const ACTIVE_KEY_PREFIX = 'seibi-active-vehicle:'
const ACTIVE_EVENT = 'seibi-active-vehicle-change'
const LEGACY_GARAGE_KEY = 'seibi-garage'
const LEGACY_PROFILE_KEY = 'seibi-vehicle-profile'

function activeKey(userId: string) {
  return `${ACTIVE_KEY_PREFIX}${userId}`
}

export function forgetLocalVehicleRecords() {
  localStorage.removeItem(LEGACY_GARAGE_KEY)
  localStorage.removeItem(LEGACY_PROFILE_KEY)
}

export function readActiveVehicleId(userId: string) {
  try {
    const raw = localStorage.getItem(activeKey(userId))
    return raw && raw.length > 0 ? raw : null
  } catch {
    return null
  }
}

export function writeActiveVehicleId(userId: string, id: string | null) {
  const key = activeKey(userId)
  if (id) localStorage.setItem(key, id)
  else localStorage.removeItem(key)
  window.dispatchEvent(new Event(ACTIVE_EVENT))
}

export function resolveActiveVehicleId(stored: string | null, vehicles: VehicleProfile[]) {
  return getActiveVehicle(vehicles, stored)?.id ?? null
}

export function useVehicles() {
  const { user, status } = useAuthSession()
  const signedIn = status === 'signed_in' && Boolean(user?.id)

  useEffect(() => {
    forgetLocalVehicleRecords()
  }, [])

  const query = useQuery({
    queryKey: vehiclesQueryKey(user?.id ?? 'signed-out'),
    queryFn: listVehicles,
    enabled: signedIn,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'online',
    refetchOnWindowFocus: true,
    retry: 1,
  })

  const vehicles = useMemo(
    () => (signedIn ? (query.data ?? []) : []),
    [signedIn, query.data],
  )
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setActiveId(null)
      return
    }
    if (query.data === undefined && (query.isPending || query.isError)) {
      setActiveId(readActiveVehicleId(user.id))
      return
    }
    const stored = readActiveVehicleId(user.id)
    const resolved = resolveActiveVehicleId(stored, vehicles)
    if (resolved !== stored) writeActiveVehicleId(user.id, resolved)
    setActiveId(resolved)
  }, [user, vehicles, query.data, query.isPending, query.isError])

  useEffect(() => {
    function sync() {
      if (!user) {
        setActiveId(null)
        return
      }
      setActiveId(resolveActiveVehicleId(readActiveVehicleId(user.id), vehicles))
    }
    window.addEventListener(ACTIVE_EVENT, sync)
    return () => window.removeEventListener(ACTIVE_EVENT, sync)
  }, [user, vehicles])

  function selectVehicle(id: string) {
    if (!user) return
    if (!vehicles.some((vehicle) => vehicle.id === id)) return
    writeActiveVehicleId(user.id, id)
    setActiveId(id)
  }

  return {
    vehicles,
    activeId,
    activeVehicle: getActiveVehicle(vehicles, activeId),
    selectVehicle,
    isSignedIn: signedIn,
    isLoading: signedIn && query.isPending,
    isError: signedIn && query.isError,
    refetch: query.refetch,
  }
}

function replaceVehicle(list: VehicleProfile[] | undefined, vehicle: VehicleProfile) {
  const current = list ?? []
  if (current.some((item) => item.id === vehicle.id)) {
    return current.map((item) => (item.id === vehicle.id ? vehicle : item))
  }
  return [...current, vehicle]
}

export function useCreateVehicle() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()

  return useMutation({
    mutationFn: (input: VehicleCreateInput) => createVehicle(input),
    onSuccess: (vehicle) => {
      if (!user) return
      queryClient.setQueryData(vehiclesQueryKey(user.id), (current: VehicleProfile[] | undefined) =>
        replaceVehicle(current, vehicle),
      )
      writeActiveVehicleId(user.id, vehicle.id)
    },
  })
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()

  return useMutation({
    mutationFn: (input: VehicleIdentityInput) => updateVehicleIdentity(input),
    onSuccess: (vehicle) => {
      if (!user) return
      queryClient.setQueryData(vehiclesQueryKey(user.id), (current: VehicleProfile[] | undefined) =>
        replaceVehicle(current, vehicle),
      )
    },
  })
}

export function useWithdrawVehicle() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()

  return useMutation({
    mutationFn: (id: string) => withdrawVehicle(id),
    onSuccess: (_void, id) => {
      if (!user) return
      queryClient.setQueryData(vehiclesQueryKey(user.id), (current: VehicleProfile[] | undefined) => {
        const next = (current ?? []).filter((item) => item.id !== id)
        const stored = readActiveVehicleId(user.id)
        writeActiveVehicleId(user.id, resolveActiveVehicleId(stored === id ? null : stored, next))
        return next
      })
    },
  })
}
