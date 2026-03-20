import React, { useState, useEffect, useReducer, useContext, useMemo, useCallback } from "react";

import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import Paper from "@material-ui/core/Paper";

import TicketListItem from "../TicketListItemCustom";
import TicketsListSkeleton from "../TicketsListSkeleton";

import useTickets from "../../hooks/useTickets";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
    ticketsListWrapper: {
        position: "relative",
        display: "flex",
        height: "100%",
        flexDirection: "column",
        overflow: "hidden",
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },

    ticketsList: {
        flex: 1,
        maxHeight: "100%",
        overflowY: "scroll",
        ...theme.scrollbarStyles,
        borderTop: "2px solid rgba(0, 0, 0, 0.12)",
    },

    ticketsListHeader: {
        color: "rgb(67, 83, 105)",
        zIndex: 2,
        backgroundColor: "white",
        borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },

    ticketsCount: {
        fontWeight: "normal",
        color: "rgb(104, 121, 146)",
        marginLeft: "8px",
        fontSize: "14px",
    },

    noTicketsText: {
        textAlign: "center",
        color: "rgb(104, 121, 146)",
        fontSize: "14px",
        lineHeight: "1.4",
    },

    noTicketsTitle: {
        textAlign: "center",
        fontSize: "16px",
        fontWeight: "600",
        margin: "0px",
    },

    noTicketsDiv: {
        display: "flex",
        // height: "190px",
        margin: 40,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    },
}));

const ticketSortAsc = (a, b) => {
    
    if (a.updatedAt < b.updatedAt) {
        return -1;
    }
    if (a.updatedAt > b.updatedAt) {
        return 1;
    }
    return 0;
}

const ticketSortDesc = (a, b) => {
   
    if (a.updatedAt > b.updatedAt) {
        return -1;
    }
    if (a.updatedAt < b.updatedAt) {
        return 1;
    }
    return 0;
}

const reducer = (state, action) => {
    //console.log("action", action, state)
    const sortDir = action.sortDir;
    
    if (action.type === "LOAD_TICKETS") {
        const newTickets = action.payload;

        newTickets.forEach((ticket) => {
            const ticketIndex = state.findIndex((t) => t.id === ticket.id);
            if (ticketIndex !== -1) {
                state[ticketIndex] = ticket;
                if (ticket.unreadMessages > 0) {
                    state.unshift(state.splice(ticketIndex, 1)[0]);
                }
            } else {
                state.push(ticket);
            }
        });
        if (sortDir && ['ASC', 'DESC'].includes(sortDir)) {
            sortDir === 'ASC' ? state.sort(ticketSortAsc) : state.sort(ticketSortDesc);
        }

        return [...state];
    }

    if (action.type === "RESET_UNREAD") {
        const ticketId = action.payload;

        const ticketIndex = state.findIndex((t) => t.id === ticketId);
        if (ticketIndex !== -1) {
            state[ticketIndex].unreadMessages = 0;
        }

        if (sortDir && ['ASC', 'DESC'].includes(sortDir)) {
            sortDir === 'ASC' ? state.sort(ticketSortAsc) : state.sort(ticketSortDesc);
        }

        return [...state];
    }

    if (action.type === "UPDATE_TICKET") {
        const ticket = action.payload;

        const ticketIndex = state.findIndex((t) => t.id === ticket.id);
        if (ticketIndex !== -1) {
            state[ticketIndex] = ticket;
        } else {
            state.unshift(ticket);
        }
        if (sortDir && ['ASC', 'DESC'].includes(sortDir)) {
            sortDir === 'ASC' ? state.sort(ticketSortAsc) : state.sort(ticketSortDesc);
        }

        return [...state];
    }

    if (action.type === "UPDATE_TICKET_UNREAD_MESSAGES") {
        const ticket = action.payload;

        const ticketIndex = state.findIndex((t) => t.id === ticket.id);
        if (ticketIndex !== -1) {
            state[ticketIndex] = ticket;
            state.unshift(state.splice(ticketIndex, 1)[0]);
        } else {
            if (action.status === action.payload.status) {
                state.unshift(ticket);
            }
        }
        if (sortDir && ['ASC', 'DESC'].includes(sortDir)) {
            sortDir === 'ASC' ? state.sort(ticketSortAsc) : state.sort(ticketSortDesc);
        }

        return [...state];
    }

    if (action.type === "UPDATE_TICKET_CONTACT") {
        const contact = action.payload;
        const ticketIndex = state.findIndex((t) => t.contactId === contact.id);
        if (ticketIndex !== -1) {
            state[ticketIndex].contact = contact;
        }
        return [...state];
    }

    if (action.type === "DELETE_TICKET") {
        const ticketId = action.payload;
        const ticketIndex = state.findIndex((t) => t.id === ticketId);
        if (ticketIndex !== -1) {
            state.splice(ticketIndex, 1);
        }

        if (sortDir && ['ASC', 'DESC'].includes(sortDir)) {
            sortDir === 'ASC' ? state.sort(ticketSortAsc) : state.sort(ticketSortDesc);
        }

        return [...state];
    }

    if (action.type === "RESET") {
        return [];
    }
};

const TicketsListCustom = (props) => {
    const {
        setTabOpen,
        status,
        searchParam,
        searchOnMessages,
        tags,
        users,
        showAll,
        selectedQueueIds,
        updateCount,
        style,
        whatsappIds,
        forceSearch,
        statusFilter,
        userFilter,
        sortTickets
    } = props;

    const classes = useStyles();
    const [pageNumber, setPageNumber] = useState(1);
    let [ticketsList, dispatch] = useReducer(reducer, []);
    //   const socketManager = useContext(SocketContext);
    const { user, socket } = useContext(AuthContext);

    const { profile, queues } = user;
    const effectiveStatus = status === "nobot" ? "pending" : status;

    const showTicketWithoutQueue = user.allTicket === 'enable';
    const companyId = user.companyId;

    useEffect(() => {
        dispatch({ type: "RESET" });
        setPageNumber(1);
    }, [status, searchParam, dispatch, showAll, tags, users, forceSearch, selectedQueueIds, whatsappIds, statusFilter, sortTickets, searchOnMessages]);

    const { tickets, hasMore, loading } = useTickets({
    pageNumber,
    searchParam,
    status: effectiveStatus,
    showAll,
    searchOnMessages: searchOnMessages ? "true" : "false",
    tags: JSON.stringify(tags),
    users: JSON.stringify(users),
    queueIds: JSON.stringify(selectedQueueIds),
    whatsappIds: JSON.stringify(whatsappIds),
    statusFilter: JSON.stringify(statusFilter),
    userFilter,
    sortTickets
});



    useEffect(() => {
        if (companyId) {
            dispatch({
                type: "LOAD_TICKETS",
                payload: tickets,
                status,
                sortDir: sortTickets
            });
        }
    }, [tickets, companyId, dispatch, status, sortTickets]);


    // -----------------------------------------------------------
    // NOVO CÓDIGO - CORREÇÃO DE ESTADO OBSOLETO E FILTRO "NOBOT"
    // -----------------------------------------------------------

    const shouldUpdateTicket = ticket => {
        return (!ticket?.userId || ticket?.userId === user?.id || showAll) &&
            ((!ticket?.queueId && showTicketWithoutQueue) || selectedQueueIds.indexOf(ticket?.queueId) > -1)
    }

    const notBelongsToUserQueues = (ticket) =>
        ticket.queueId && selectedQueueIds.indexOf(ticket.queueId) === -1;


    // Função auxiliar para verificar se o ticket pertence à ABA ATUAL
    const ticketBelongsToCurrentTab = (ticket, currentStatus) => {
        if (currentStatus === "nobot") {
            // Critério da aba "No Bot": Sem fila (queueId === null) e não fechado.
            return ticket.queueId === null && ticket.status !== "closed";
        }
        if (currentStatus === "pending") {
            // Critério da aba "Pendente": Status 'pending' E COM fila (not null).
            return ticket.status === "pending" && ticket.queueId !== null;
        }
        // Para 'open', 'closed', etc., o status deve ser literal.
        return ticket.status === currentStatus;
    };
    
    // CORREÇÃO: Usando useCallback para garantir que esta função SEMPRE use o estado mais fresco.
    const onCompanyTicketTicketsList = useCallback(
        (data) => {
            
            // Lógica de Criação (action === "create")
            if (data.action === "create") {
                const ticketInCorrectTab = ticketBelongsToCurrentTab(data.ticket, status);
                
                if (shouldUpdateTicket(data.ticket) && ticketInCorrectTab) {
                    dispatch({
                        type: "UPDATE_TICKET",
                        payload: data.ticket,
                        status: status,
                        sortDir: sortTickets
                    });
                }
            }
            
            if (data.action === "updateUnread") {
                dispatch({
                    type: "RESET_UNREAD",
                    payload: data.ticketId,
                    status: status,
                    sortDir: sortTickets
                });
            }
            
            // Lógica de Atualização/Movimentação (action === "update")
            if (data.action === "update" && shouldUpdateTicket(data.ticket)) {
                
                const ticketInCorrectTab = ticketBelongsToCurrentTab(data.ticket, status);

                if (ticketInCorrectTab) {
                    // O ticket foi movido para esta aba ou atualizado nela.
                    dispatch({
                        type: "UPDATE_TICKET",
                        payload: data.ticket,
                        status: status,
                        sortDir: sortTickets
                    });
                } else {
                    // O ticket foi movido para OUTRA aba (ex: de 'pending' para 'nobot').
                    // Ele deve ser REMOVIDO da lista atual.
                    dispatch({
                        type: "DELETE_TICKET", 
                        payload: data.ticket?.id, 
                        status: status,
                        sortDir: sortTickets
                    });
                }
            }
            
            if (data.action === "update" && notBelongsToUserQueues(data.ticket)) {
                dispatch({
                    type: "DELETE_TICKET", payload: data.ticket?.id, status: status,
                    sortDir: sortTickets
                });
            }

            if (data.action === "delete") {
                dispatch({
                    type: "DELETE_TICKET", payload: data?.ticketId, status: status,
                    sortDir: sortTickets
                });

            }
        },
        // Dependências completas para garantir o estado fresco
        [
            dispatch, 
            status, 
            sortTickets, 
            user.id, 
            showAll, 
            selectedQueueIds, 
            showTicketWithoutQueue
        ]
    );

    // O restante dos manipuladores de socket (para appMessage e contact) não usam useCallback aqui, 
    // então eles devem ser re-definidos para que o useEffect os capture.
    
    // Função original onCompanyAppMessageTicketsList
    const onCompanyAppMessageTicketsList = (data) => {
        if (data.action === "create" &&
            shouldUpdateTicket(data.ticket) && ticketBelongsToCurrentTab(data.ticket, status)) { // Usa a função de filtro
            dispatch({
                type: "UPDATE_TICKET_UNREAD_MESSAGES",
                payload: data.ticket,
                status: status,
                sortDir: sortTickets
            });
        }
    };

    // Função original onCompanyContactTicketsList
    const onCompanyContactTicketsList = (data) => {
        if (data.action === "update" && data.contact) {
            dispatch({
                type: "UPDATE_TICKET_CONTACT",
                payload: data.contact,
                status: status,
                sortDir: sortTickets
            });
        }
    };
    
    const onConnectTicketsList = () => {
        if (status) {
            socket.emit("joinTickets", status);
        } else {
            socket.emit("joinNotification");
        }
    }


    useEffect(() => {
        
        socket.on("connect", onConnectTicketsList)
        // Usa a função onCompanyTicketTicketsList envolvida em useCallback
        socket.on(`company-${companyId}-ticket`, onCompanyTicketTicketsList); 
        
        // Os outros manipuladores precisam ser recriados no escopo do useEffect 
        // ou adicionados às dependências para funcionar corretamente.
        socket.on(`company-${companyId}-appMessage`, onCompanyAppMessageTicketsList);
        socket.on(`company-${companyId}-contact`, onCompanyContactTicketsList);

        return () => {
            if (status) {
                socket.emit("leaveTickets", status);
            } else {
                socket.emit("leaveNotification");
            }
            socket.off("connect", onConnectTicketsList);
            socket.off(`company-${companyId}-ticket`, onCompanyTicketTicketsList);
            socket.off(`company-${companyId}-appMessage`, onCompanyAppMessageTicketsList);
            socket.off(`company-${companyId}-contact`, onCompanyContactTicketsList);
        };

    // Adicione a nova função de callback e todas as outras dependências necessárias
    }, [status, showAll, user, selectedQueueIds, profile, queues, sortTickets, showTicketWithoutQueue, companyId, socket, onCompanyTicketTicketsList]);


    // -----------------------------------------------------------
    // FIM NOVO CÓDIGO
    // -----------------------------------------------------------


useEffect(() => {
  if (typeof updateCount === "function") {
    let filteredCount = ticketsList.length;

    if (status === "pending") {
      // Contar apenas os tickets com fila
      filteredCount = ticketsList.filter(t => t.queueId != null).length;
    }

    if (status === "nobot") {
      // Contar apenas os tickets sem fila
      filteredCount = ticketsList.filter(t => t.queueId == null).length;
    }

    updateCount(filteredCount);
  }
}, [ticketsList, status, updateCount]);

const loadMore = () => {
        setPageNumber((prevState) => prevState + 1);
    };

    const handleScroll = (e) => {
        if (!hasMore || loading) return;

        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

        if (scrollHeight - (scrollTop + 100) < clientHeight) {
            loadMore();
        }
    };

if (status && status !== "search") {
    if (status === "nobot") {
        // ✅ Aba "No Bot": apenas sem fila
        ticketsList = ticketsList.filter(t => t.queueId == null && t.status !== "closed");
    } else if (status === "pending") {
        // ✅ Aba "Aguardando": apenas com fila
        ticketsList = ticketsList.filter(t => t.status === "pending" && t.queueId != null);
    } else {
        // ✅ Demais abas (open, closed, etc)
        ticketsList = ticketsList.filter(t => t.status === status);
    }
}


    return (
        <Paper className={classes.ticketsListWrapper} style={style}>
            <Paper
                square
                name="closed"
                elevation={0}
                className={classes.ticketsList}
                onScroll={handleScroll}
            >
                <List style={{ paddingTop: 0 }} >
                    {ticketsList.length === 0 && !loading ? (
                        <div className={classes.noTicketsDiv}>
                            <span className={classes.noTicketsTitle}>
                                {i18n.t("ticketsList.noTicketsTitle")}
                            </span>
                            <p className={classes.noTicketsText}>
                                {i18n.t("ticketsList.noTicketsMessage")}
                            </p>
                        </div>
                    ) : (
                        <>
                            {ticketsList.map((ticket) => (
                                // <List key={ticket.id}>
                                //     {console.log(ticket)}\n
                                <TicketListItem
                                    ticket={ticket}
                                    key={ticket.id}
                                    setTabOpen={setTabOpen}
                                />
                                // </List>
                            ))}
                        </>
                    )}
                    {loading && <TicketsListSkeleton />}
                </List>
            </Paper>
        </Paper>
    );
};

export default TicketsListCustom;