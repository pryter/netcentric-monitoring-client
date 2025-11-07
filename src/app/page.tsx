"use client"

import {useCallback, useEffect, useMemo, useState} from "react";
import Image from "next/image";

export default function Home() {
  const [connection, setConn] = useState<WebSocket | null>(null)
  const [data, setData] = useState<{roomReg: Record<string, any>[], connectionPool: unknown[]}| null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [url, setUrl] = useState<string>("ws://localhost:8080/monitoring")

  const connections = useMemo(() => {
    if (!data) return {mon: [], users: []}
   const mon = data?.connectionPool.filter((a: any) => (a["type"] === "monitoring")) ?? []
    const users = data?.connectionPool.filter((a: any) => (a["type"] === "default")) ?? []
    return {
     mon,
      users
    }
  }, [data?.connectionPool])

  const connect = () => {
    const conn = new WebSocket(url);
    conn.onopen = (ws) => {
      setConn(conn)
      // auto upgrade
      conn.send(JSON.stringify({type: "upgrade", data: {token:token ?? "12345"}}))
    }

    conn.onmessage = (e) => {
      const message = JSON.parse(e.data)
      if (message.data.group === "monitoring-event") {
        setData(message.data.data)
      }

      if (message.data.group === "server-response") {
        console.log(message.data.data)
      }
      if (message.data.name == "upgrade-success") {
        conn.send(JSON.stringify({type: "message", data: {group: "monitoring-action", name: "sub-mon-stream"}}))
      }
    }
  }

  const resetState = useCallback((id: string) => {
    connection?.send(JSON.stringify({type: "message", data: {group: "monitoring-action", name: "reset-room", data: {roomId: id}}}))
  }, [connection])

  return (
  <div className="p-6">

    <div className="flex flex-row items-center">
      <span className="mr-2">local:</span>
      <input type="radio" name="server" id="local" value="local" defaultChecked onChange={(e) => {setUrl("ws://localhost:8080/monitoring")}}/>
      <span className="mr-2 ml-4">global:</span>
      <input type="radio" name="server" id="global" value="global" onChange={(e) => {setUrl("wss://netcen-game-server-oc1.pryter.me/monitoring")}}/>
    </div>
    <div className="relative flex flex-row space-x-2 max-w-[200px] mb-6">
      <input className="border rounded-lg px-4 grow" type="text" placeholder="token" onChange={(e) => {setToken(e.target.value)}}/>
      <button className="border py-1 px-3 rounded-lg text-sm font-semibold cursor-pointer" onClick={() => {connect()}}>Connect</button>
    </div>
    <h1 className="font-semibold mb-2">Connection Pool</h1>
    <p>Users <span className="font-semibold">{connections.users?.length}</span> Monitor <span className="font-semibold">{connections.mon?.length}</span></p>
    <div className="flex items-start p-4 border rounded-xl gap-4 overflow-x-auto">
      {data?.connectionPool.map((c) => {
        const d = c as {id: string, state: string, user: Record<string, string>, lastActive: number, type: string}
        return <div className="flex flex-col border relative bg-white rounded-xl p-4" key={d.id ?? ""}>
          <h1 className="top-1 absolute text-[8px]">conn-id: {d.id}</h1>
          {d.type === "monitoring" ? <h1 className="mt-8 mb-4 font-semibold text-gray-500">Monitoring Client</h1>: <div className="flex flex-row space-x-2 mt-2">
            {d.user?.avatar &&
                <img src={d.user?.avatar} alt={"avatar"} className="rounded-full" width={64} height={64}/>}
            <div className="flex flex-col">
              <h1 className="text-xs">userid: <span className="font-semibold">{d.user?.uid}</span></h1>
              <h1 className="text-sm">nickname: <span className="font-semibold">{d.user?.nickname}</span></h1>
              <div className="flex space-x-2">
                <h1 className="text-sm">level: {d.user?.level}</h1>
                <h1 className="text-sm">score: {d.user?.score}</h1>
              </div>
            </div>
          </div>}
          <div>
            <h1 className="font-semibold mt-2">Connection detail</h1>
            <h1 className="text-sm">state: {d.state}</h1>
            <h1 className="text-sm">acc-type: {d.type}</h1>
          </div>
        </div>
      })}
    </div>
    <h1 className="font-semibold mb-2 mt-4">Gameroom Registry</h1>
    <div className="flex flex-row p-4 border rounded-xl gap-4 overflow-x-auto">
      {data?.roomReg.map((r) => {
        return <div className="flex flex-wrap max-w-[400px] border p-2 rounded-xl space-x-2 space-y-1" key={r.id as string}>
          {
            Object.entries(r).map(([k, v]) => {
              if (typeof v === "string" || typeof v === "number") {
                return  (
                  <div className="bg-gray-100 rounded-full px-2" key={k}>
                    <span className="text-gray-500 font-semibold">{k}</span>: {v}
                  </div>
                )
              }

              if (v === null) {
                return   <div className="bg-gray-100 rounded-full px-2" key={k}>
                  <span className="text-gray-500 font-semibold">{k}</span>: <span className="text-amber-600">null</span>
                </div>
              }
              if (k === "players") {
                return <div key={k} className="px-1 mt-3">
                  <h1 className="font-semibold">Players</h1>
                  {Object.values(v).map((vv: any, k) => {
                    return <div key={k} style={{opacity: vv.isDisconnected ? 0.6 : 1}} className="flex flex-row space-x-2 mt-2">
                      {vv?.avatarUri &&
                          <img src={vv.avatarUri} alt={"avatar"} className="rounded-full grow-0 size-[64px]" width={64} height={64}/>}
                      <div className="flex flex-col">
                        <h1 className="text-xs">userid: <span className="font-semibold">{vv.id}</span></h1>
                        <h1 className="text-sm">nickname: <span className="font-semibold">{vv.displayName}</span></h1>
                        <h1 className="text-sm">match-score: <span className="font-semibold">{vv.score}</span></h1>
                        <div className="flex space-x-2">
                          <h1 className="text-sm">isReady: <span className="font-semibold">{vv.isReady ? "true" : "false"}</span></h1>
                          <h1 className="text-sm">isDisconnected: <span className="font-semibold">{vv.isDisconnected ? "true" : "false"}</span></h1>
                        </div>
                      </div>
                    </div>
                  })}
                </div>
              }

              if (k === "question") {
                return <div className="bg-gray-100 rounded-full px-2" key={k}>
                  <span className="text-gray-500 font-semibold">{k}</span>: {v.problem.join(", ")} find {v.target}
                </div>
              }
            })
          }
          <div className="mt-4 flex space-x-2 items-center">
            <button className="border py-1 px-3 rounded-xl text-sm font-semibold cursor-pointer" onClick={() => {resetState(r.id as string)}}>Reset States</button>
          </div>
        </div>
      })}
    </div>
  </div>
  );
}
