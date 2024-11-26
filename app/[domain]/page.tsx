import { useRef, useState } from 'react'
import { AppBskyActorDefs } from "@atproto/api"
import { Check, X } from "lucide-react"

import { agent } from "@/lib/atproto"
import { prisma } from "@/lib/db"
import { hasExplicitSlur } from "@/lib/slurs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Profile } from "@/components/profile"
import { Stage } from "@/components/stage"

export function generateMetadata({ params }: { params: { domain: string } }) {
  const domain = params.domain
  return {
    title: `${domain} - get your community handle for Bluesky`,
    description: `get your own ${domain} handle`,
  }
}

export default function IndexPage({
  params,
  searchParams,
}: {
  params: {
    domain: string
  }
  searchParams: {
    handle?: string
    "new-handle"?: string
  }
}) {
  const domain = params.domain
  let handle = searchParams.handle
  let newHandle = searchParams["new-handle"]
  let profile: AppBskyActorDefs.ProfileView | undefined
  let error1: string | undefined
  let error2: string | undefined

  const [muted, setMuted] = useState(true) // State to control mute/unmute
  const videoRef = useRef<HTMLVideoElement | null>(null)

  if (handle) {
    try {
      if (!handle.includes(".")) {
        handle += ".bsky.social"
      }
      console.log("fetching profile", handle)
      const actor = await agent.getProfile({
        actor: handle,
      })
      if (!actor.success) throw new Error("fetch was not a success")
      profile = actor.data
    } catch (e) {
      console.error(e)
      error1 = (e as Error)?.message ?? "unknown error"
    }

    if (newHandle && profile) {
      newHandle = newHandle.trim().toLowerCase()
      if (!newHandle.includes(".")) {
        newHandle += "." + domain
      }
      if (!error1) {
        // regex: (alphanumeric, -, _).(domain)
        const validHandle = newHandle.match(
          new RegExp(`^[a-zA-Z0-9-_]+.${domain}$`)
        )
        if (validHandle) {
          try {
            const handle = newHandle.replace(`.${domain}`, "")
            if (hasExplicitSlur(handle)) {
              throw new Error("slur")
            }

            if (domain === "army.social" && RESERVED.includes(handle)) {
              throw new Error("reserved")
            }

            const existing = await prisma.user.findFirst({
              where: { handle },
              include: { domain: true },
            })
            if (existing && existing.domain.name === domain) {
              if (existing.did !== profile.did) {
                error2 = "handle taken"
              }
            } else {
              await prisma.user.create({
                data: {
                  handle,
                  did: profile.did,
                  domain: {
                    connectOrCreate: {
                      where: { name: domain },
                      create: { name: domain },
                    },
                  },
                },
              })
            }
          } catch (e) {
            console.error(e)
            error2 = (e as Error)?.message ?? "unknown error"
          }
        } else {
          error2 = "invalid handle"
        }
      }
    }
  }

  // Mute/unmute handler for video
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
      setMuted(videoRef.current.muted)
    }
  }

  return (
    <main className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="flex max-w-[980px] flex-col items-start gap-4">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter sm:text-3xl md:text-5xl lg:text-6xl">
          Get your own {domain} <br className="hidden sm:inline" />
          handle for Bluesky
        </h1>
        <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
          Follow the instructions below to get your own {domain} handle
        </p>
      </div>

      {/* Stage 1: Enter current handle */}
      <Stage title="Enter your current handle" number={1}>
        <form>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <div className="flex w-full max-w-sm items-center space-x-2">
              {newHandle && (
                <input type="hidden" name="new-handle" value="" />
              )}
              <Input
                type="text"
                name="handle"
                placeholder="example.bsky.social"
                defaultValue={handle}
                required
              />
              <Button type="submit">Submit</Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter your current handle, not including the @
            </p>
            {error1 && (
              <p className="flex flex-row items-center gap-2 text-sm text-red-500">
                <X className="size-4" /> Handle not found - please try again
              </p>
            )}
            {profile && (
              <>
                <p className="text-muted-forground mt-4 flex flex-row items-center gap-2 text-sm">
                  <Check className="size-4 text-green-500" /> Account found
                </p>
                <Profile profile={profile} className="mt-4" />
              </>
            )}
          </div>
        </form>
      </Stage>

      {/* Stage 2: Choose new handle */}
      <Stage title="Choose your new handle" number={2} disabled={!profile}>
        <form>
          <input type="hidden" name="handle" value={handle} />
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input
                type="text"
                name="new-handle"
                placeholder={`example.${domain}`}
                defaultValue={newHandle}
              />
              <Button type="submit">Submit</Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter the {domain} handle that you would like to have, not
              including the @
            </p>
            {error2 && (
              <p className="text-sm text-red-500">
                {(() => {
                  switch (error2) {
                    case "handle taken":
                      return "Handle already taken - please enter a different handle"
                    case "invalid handle":
                    case "slur":
                      return "Invalid handle - please enter a different handle"
                    case "reserved":
                      return "Reserved handle - please enter a different handle"
                    default:
                      return "An error occurred - please try again"
                  }
                })()}
              </p>
            )}
          </div>
        </form>
      </Stage>

      {/* Stage 3: Change handle in Bluesky app */}
      <Stage
        title="Change your handle within the Bluesky app"
        number={3}
        disabled={!newHandle || !!error2}
        last
      >
        <p className="max-w-lg text-sm">
          Go to Settings {">"} Account {">"} Handle {">"}. Select &quot;I
          have my own domain&quot; and enter{" "}
          {newHandle ? `"${newHandle}"` : "your new handle"}. Finally, tap
          &quot;Verify DNS Record&quot;.
        </p>
        <p className="mt-6 max-w-lg text-sm">
          If you like this project, consider{" "}
          <a href="https://github.com/sponsors/mozzius" className="underline">
            sponsoring Mozzius' work
          </a>
          .
        </p>
      </Stage>

      {/* Video embed with subtitle */}
      <div className="video-container mt-8">
        <h2 className="text-lg text-muted-foreground sm:text-xl mb-4">
          Sedici.me Tutorial Video
        </h2>
        <video
          ref={videoRef}
          className="w-full max-w-none"
          width="100%" // makes the video responsive
          height="auto"
          controls
          autoPlay
          loop
          muted={muted}  // Controlled muted state
          poster="/poster.jpeg"  {/* Path to your poster image */}
        >
          <source src="/instructions.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <button
          onClick={toggleMute}
          className="mt-4 p-2 bg-blue-500 text-white"
        >
          {muted ? "Unmute" : "Mute"}
        </button>
      </div>
    </main>
  )
}

const RESERVED = [
  "CharlesLeclerc",
  "Charles_Leclerc",
  "Leclerc",
  "16",
  "Charles",
  "Sedici",
  "natgracing",
  "natg",
  "NG",
  "CL",
].map((x) => x.toLowerCase())
